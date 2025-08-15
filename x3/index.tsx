
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { jsPDF } from 'jspdf';

// Ensure API_KEY is correctly sourced from environment variables
const apiKey = process.env.AIzaSyArrpR6DhDh_Kdw35P-vDlmSKpmrY0pSVo;
const globalErrorMessageElement = document.getElementById('error-message'); // For global config errors

if (!apiKey) {
    const errorMsg = "Erro de configuração: API_KEY não encontrada. Verifique as variáveis de ambiente.";
    console.error(errorMsg);
    if (globalErrorMessageElement) {
        globalErrorMessageElement.textContent = errorMsg;
        (globalErrorMessageElement as HTMLElement).style.display = 'block';
    }
    throw new Error("API_KEY not configured.");
}

const ai = new GoogleGenAI({ apiKey });

interface AIProfile {
    id: string;
    name: string;
    fullName: string;
    role: string;
    basePrompt: string;
    model: string;
}

interface ChatMessage {
    text: string;
    sender: 'user' | 'ai' | 'summary'; // Added 'summary' sender type
    timestamp: string;
    isCustomPromptResponse?: boolean;
    aiModel?: string; 
}

interface PromptTemplate {
    name: string;
    prompt: string;
}

const MAX_HISTORY_ITEMS = 100; 

// DOM Elements
const cardsContainer = document.getElementById('ai-cards-container');
const chatLog = document.getElementById('chat-log');
const chatPlaceholder = document.getElementById('chat-placeholder');
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessageElement = document.getElementById('error-message'); 
const interactionHeader = document.getElementById('interaction-header');
const activeAINameElement = document.getElementById('active-ai-name');
const endChatButton = document.getElementById('end-chat-button') as HTMLButtonElement;

const exportHistoryJsonButton = document.getElementById('export-history-json-button') as HTMLButtonElement;
const exportHistoryMdButton = document.getElementById('export-history-md-button') as HTMLButtonElement;
const exportHistoryPdfButton = document.getElementById('export-history-pdf-button') as HTMLButtonElement;
const summarizeChatButton = document.getElementById('summarize-chat-button') as HTMLButtonElement;

const fileUploadArea = document.getElementById('file-upload-area');

// State
let allAIProfiles: AIProfile[] = [];
let currentChat: Chat | null = null;
let currentActiveAIProfile: AIProfile | null = null;
let currentAbortController: AbortController | null = null;
let renderedAICards: HTMLElement[] = [];


function displayErrorMessage(message: string, isGlobal: boolean = false) {
    const targetElement = isGlobal ? globalErrorMessageElement : errorMessageElement;
    if (targetElement) {
        targetElement.textContent = message;
        targetElement.style.display = 'block';
    }
    if (!isGlobal && loadingIndicator) loadingIndicator.style.display = 'none';
}

function clearErrorMessage(isGlobal: boolean = false) {
    const targetElement = isGlobal ? globalErrorMessageElement : errorMessageElement;
    if (targetElement) {
        targetElement.style.display = 'none';
        targetElement.textContent = '';
    }
}

function logInteraction(profile: AIProfile | null, type: 'base chat activation' | 'custom prompt execution' | 'custom prompt response' | 'chat message sent' | 'chat message received' | 'summary request' | 'summary received' | 'history export', promptOrResponseSnippet: string) {
    const timestamp = new Date().toISOString();
    const aiIdentifier = profile ? `${profile.fullName} (${profile.id})` : 'N/A';
    console.log(`[FOUNDLAB IA LOG] Timestamp: ${timestamp}, IA: ${aiIdentifier}, Type: ${type}, Data: "${promptOrResponseSnippet.substring(0, 150)}${promptOrResponseSnippet.length > 150 ? '...' : ''}"`);
}

function formatResponseForDisplay(text: string): string {
    let sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    sanitizedText = sanitizedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, (_match, codeBlock) => {
            const saneCodeBlock = codeBlock.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<pre><code>${saneCodeBlock}</code></pre>`;
        })
        .replace(/`([^`]+)`/g, (_match, inlineCode) => {
            const saneInlineCode = inlineCode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<code>${saneInlineCode}</code>`;
        });
    return sanitizedText.replace(/\n/g, '<br>');
}

// --- localStorage Chat History Functions ---
function getChatHistoryStorageKey(profileId: string): string {
    return `foundlab-chat-history-${profileId}`;
}

function loadChatHistory(profile: AIProfile): ChatMessage[] {
    if (!profile) return [];
    try {
        const historyJson = localStorage.getItem(getChatHistoryStorageKey(profile.id));
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error(`Error loading chat history for ${profile.name}:`, error);
        return [];
    }
}

function saveMessageToHistory(profile: AIProfile, message: ChatMessage) {
    if (!profile) return;
    try {
        const history = loadChatHistory(profile);
        history.push(message);
        if (history.length > MAX_HISTORY_ITEMS) {
            history.splice(0, history.length - MAX_HISTORY_ITEMS); 
        }
        localStorage.setItem(getChatHistoryStorageKey(profile.id), JSON.stringify(history));
    } catch (error) {
        console.error(`Error saving message to history for ${profile.name}:`, error);
    }
}

function displayStoredMessage(message: ChatMessage, aiProfileForDisplay: AIProfile) {
    if (!chatLog) return;
    if (chatPlaceholder) chatPlaceholder.style.display = 'none';

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    if (message.sender === 'user') messageElement.classList.add('user-message');
    else if (message.sender === 'ai') messageElement.classList.add('ai-message');
    else if (message.sender === 'summary') messageElement.classList.add('summary-message');
    
    const formattedText = formatResponseForDisplay(message.text);
    const timestampStr = new Date(message.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    let prefixHTML = '';
    if (message.sender === 'ai') {
        const aiName = aiProfileForDisplay?.name || 'IA';
        prefixHTML = `<strong>${aiName}${message.isCustomPromptResponse ? ' (Resposta Customizada)' : ''}:</strong><br>`;
    } else if (message.sender === 'summary') {
        prefixHTML = `<strong>Resumo da Conversa (${aiProfileForDisplay?.name || 'IA'}):</strong><br>`;
    }
    messageElement.innerHTML = `${prefixHTML}${formattedText}<span class="message-timestamp">${timestampStr}</span>`;
    
    chatLog.appendChild(messageElement);
}


function appendMessageToChatLog(text: string, sender: 'user' | 'ai' | 'summary', aiProfile: AIProfile | null, isCustomPromptResponse: boolean = false, streamElement?: HTMLElement): HTMLElement {
    const activeProfile = aiProfile || currentActiveAIProfile;
    if (!chatLog || !activeProfile) {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = formatResponseForDisplay(text);
        return tempElement;
    }

    if (chatPlaceholder) chatPlaceholder.style.display = 'none';

    const messageObject: ChatMessage = {
        text: text,
        sender: sender,
        timestamp: new Date().toISOString(),
        isCustomPromptResponse: isCustomPromptResponse,
        aiModel: sender === 'ai' || sender === 'summary' ? activeProfile.model : undefined
    };

    // Summaries are not saved to localStorage history to avoid them being part of future summarization inputs
    // or cluttering the exportable "core" conversation.
    if (!streamElement && sender !== 'summary') { 
      if (sender === 'user' || (sender === 'ai' && !isCustomPromptResponse)){ 
          saveMessageToHistory(activeProfile, messageObject);
      } else if (sender === 'ai' && isCustomPromptResponse) { 
          saveMessageToHistory(activeProfile, messageObject);
      }
    }
    
    const messageElementToUpdate = streamElement || document.createElement('div');
    if (!streamElement) {
      messageElementToUpdate.classList.add('chat-message');
      if (sender === 'user') messageElementToUpdate.classList.add('user-message');
      else if (sender === 'ai') messageElementToUpdate.classList.add('ai-message');
      else if (sender === 'summary') messageElementToUpdate.classList.add('summary-message');
    }
    
    const formattedText = formatResponseForDisplay(text);
    const timestampStr = new Date(messageObject.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let prefixHTML = '';
    if (sender === 'ai') {
        const aiNameForDisplay = activeProfile.name;
        prefixHTML = `<strong>${aiNameForDisplay}${isCustomPromptResponse ? ' (Resposta Customizada)' : ''}:</strong><br>`;
    } else if (sender === 'summary') {
        prefixHTML = `<strong>Resumo da Conversa (${activeProfile.name}):</strong><br>`;
    }

    messageElementToUpdate.innerHTML = `${prefixHTML}${formattedText}<span class="message-timestamp">${timestampStr}</span>`;
    
    if (!streamElement) {
        chatLog.appendChild(messageElementToUpdate);
    }
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageElementToUpdate;
}


function resetChatUI(clearActiveAI: boolean = true) {
    if (chatLog) chatLog.innerHTML = '';
    if (chatPlaceholder) {
        chatPlaceholder.textContent = 'Selecione uma IA e um modo de interação (Ativar IA para chat ou Executar Prompt Customizado).';
        chatPlaceholder.style.display = 'block';
    }
    if (interactionHeader && clearActiveAI) interactionHeader.style.display = 'none';
    if (activeAINameElement && clearActiveAI) activeAINameElement.textContent = '';
    if (chatForm && clearActiveAI) chatForm.style.display = 'none';
    if (fileUploadArea && clearActiveAI) fileUploadArea.style.display = 'none';
    
    if (chatInput && clearActiveAI) {
        chatInput.value = '';
        chatInput.disabled = true;
    }
    if (sendButton && clearActiveAI) sendButton.disabled = true;
    
    clearErrorMessage();
    if (loadingIndicator) loadingIndicator.style.display = 'none';

    if (clearActiveAI) {
        currentChat = null;
        currentActiveAIProfile = null;
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
        renderedAICards.forEach(card => card.classList.remove('active'));
        document.querySelectorAll('.activate-ai-button').forEach(btn => {
            (btn as HTMLButtonElement).disabled = false;
            btn.textContent = 'Ativar IA (Chat)';
        });
         document.querySelectorAll('.custom-prompt-execute-button').forEach(btn => {
            (btn as HTMLButtonElement).disabled = false;
        });
    }
}

async function activateAI(profile: AIProfile) {
    if (currentActiveAIProfile?.id === profile.id && currentChat) return; 

    resetChatUI(true); 

    currentActiveAIProfile = profile;
    if (currentAbortController) {
        currentAbortController.abort(); 
    }
    currentAbortController = new AbortController();

    renderedAICards.forEach(card => {
        const cardProfileId = card.dataset.aiId;
        const activateButton = card.querySelector('.activate-ai-button') as HTMLButtonElement;
        
        if (cardProfileId === profile.id) {
            card.classList.add('active');
            if (activateButton) {
                activateButton.textContent = 'IA Ativa (Chat)';
                activateButton.disabled = true; 
            }
        } else {
            card.classList.remove('active');
            if (activateButton) {
                activateButton.textContent = 'Ativar IA (Chat)';
                activateButton.disabled = false;
            }
        }
    });

    if (activeAINameElement) activeAINameElement.textContent = `Chat com: ${profile.name} (${profile.fullName})`;
    if (interactionHeader) interactionHeader.style.display = 'flex';
    if (chatForm) chatForm.style.display = 'flex';
    if (fileUploadArea) fileUploadArea.style.display = 'flex'; 

    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = `Envie uma mensagem para ${profile.fullName}...`;
        chatInput.focus();
    }
    if (sendButton) sendButton.disabled = false;
    
    if (chatLog && chatPlaceholder) { 
        chatLog.innerHTML = '';
        const history = loadChatHistory(profile);
        if (history.length > 0) {
            history.forEach(msg => displayStoredMessage(msg, profile));
            chatPlaceholder.style.display = 'none';
        } else {
            chatPlaceholder.textContent = `Chat com ${profile.name} (${profile.fullName}) ativado. Instrução de sistema definida. Envie sua mensagem.`;
            chatPlaceholder.style.display = 'block';
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    try {
        currentChat = ai.chats.create({
            model: profile.model,
            config: {
                systemInstruction: profile.basePrompt,
            },
        });
        logInteraction(profile, 'base chat activation', profile.basePrompt);
    } catch (error) {
        console.error('Error creating chat instance:', error);
        displayErrorMessage(`Erro ao inicializar chat com ${profile.name}: ${error instanceof Error ? error.message : String(error)}`);
        resetChatUI(true);
    }
}

async function executeCustomPrompt(profile: AIProfile, customPrompt: string) {
    if (!customPrompt || customPrompt.trim() === '') {
        displayErrorMessage(`O prompt customizado para ${profile.name} está vazio.`);
        return;
    }

    resetChatUI(false); 
    if(chatPlaceholder) chatPlaceholder.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    clearErrorMessage();
    
    const userMessageForHistory: ChatMessage = { 
        text: customPrompt,
        sender: 'user',
        timestamp: new Date().toISOString(),
        isCustomPromptResponse: true 
    };
    saveMessageToHistory(profile, userMessageForHistory); 
    displayStoredMessage(userMessageForHistory, profile); 
    logInteraction(profile, 'custom prompt execution', customPrompt);
    

    const card = renderedAICards.find(c => c.dataset.aiId === profile.id);
    const executeButton = card?.querySelector('.custom-prompt-execute-button') as HTMLButtonElement;
    const customPromptTextarea = card?.querySelector(`#custom-prompt-input-${profile.id}`) as HTMLTextAreaElement;

    if (executeButton) executeButton.disabled = true;
    if (customPromptTextarea) customPromptTextarea.disabled = true;
    
    const localAbortController = new AbortController();
    let currentAiResponse = '';
    let prefixAdded = false;
    const aiMessageElement = document.createElement('div');
    aiMessageElement.classList.add('chat-message', 'ai-message');

    if (chatLog) {
        const thinkingSpan = document.createElement('span');
        thinkingSpan.classList.add('thinking-animation');
        thinkingSpan.textContent = '...';
        aiMessageElement.appendChild(thinkingSpan);
        chatLog.appendChild(aiMessageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    const aiDisplayName = `${profile.name} (Resposta Customizada)`;
    const prefixHTML = `<strong>${aiDisplayName}:</strong><br>`;

    try {
        const stream = await ai.models.generateContentStream({
            model: profile.model,
            contents: customPrompt,
        }); 

        for await (const chunk of stream) {
            if (localAbortController.signal.aborted) {
                if (prefixAdded) {
                     appendMessageToChatLog(currentAiResponse + "\n<em>(Execução cancelada)</em>", 'ai', profile, true, aiMessageElement);
                } else {
                    aiMessageElement.remove(); 
                }
                break;
            }
            const text = chunk.text;
            if (text) {
                if (!prefixAdded) {
                    aiMessageElement.innerHTML = ''; 
                    prefixAdded = true;
                }
                currentAiResponse += text;
                const formattedText = formatResponseForDisplay(currentAiResponse);
                const timestampStr = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                aiMessageElement.innerHTML = `${prefixHTML}${formattedText}<span class="message-timestamp">${timestampStr}</span>`;

            } else if (!prefixAdded && currentAiResponse === '') { 
                aiMessageElement.innerHTML = prefixHTML;
                const thinkingSpan = document.createElement('span');
                thinkingSpan.classList.add('thinking-animation');
                thinkingSpan.textContent = '...';
                aiMessageElement.appendChild(thinkingSpan);
                prefixAdded = true; 
            }
            if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
        }

        if (localAbortController.signal.aborted) {
            // Already handled
        } else if (!prefixAdded || currentAiResponse.trim() === '') {
            currentAiResponse = currentAiResponse.trim() === '' && prefixAdded ? "IA respondeu com conteúdo vazio." : "Não houve resposta da IA.";
            appendMessageToChatLog(currentAiResponse, 'ai', profile, true, aiMessageElement); 
        } else {
            appendMessageToChatLog(currentAiResponse, 'ai', profile, true, aiMessageElement);
        }
        
        if (prefixAdded) {
             logInteraction(profile, 'custom prompt response', currentAiResponse);
        }

    } catch (error) {
        console.error(`Error executing custom prompt for ${profile.name}:`, error);
        if (aiMessageElement.parentNode) aiMessageElement.remove();
        displayErrorMessage(`Erro ao executar prompt customizado para ${profile.name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (executeButton) executeButton.disabled = false;
        if (customPromptTextarea) customPromptTextarea.disabled = false;
    }
}


chatForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentChat || !currentActiveAIProfile || !chatInput || chatInput.value.trim() === '') {
        return;
    }

    const userInput = chatInput.value.trim();
    logInteraction(currentActiveAIProfile, 'chat message sent', userInput);
    appendMessageToChatLog(userInput, 'user', currentActiveAIProfile); 
    
    chatInput.value = ''; 
    chatInput.disabled = true;
    sendButton.disabled = true;
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    clearErrorMessage();

    const abortSignal = currentAbortController?.signal; 
    let currentAiResponse = '';
    let prefixAdded = false;
    const aiMessageElement = document.createElement('div');
    aiMessageElement.classList.add('chat-message', 'ai-message');

    if (chatLog && currentActiveAIProfile) {
        const thinkingSpan = document.createElement('span');
        thinkingSpan.classList.add('thinking-animation');
        thinkingSpan.textContent = '...';
        aiMessageElement.appendChild(thinkingSpan);
        chatLog.appendChild(aiMessageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    const aiDisplayName = currentActiveAIProfile!.name;
    const prefixHTML = `<strong>${aiDisplayName}:</strong><br>`;

    try {
        const stream = await currentChat.sendMessageStream({ message: userInput });
        
        for await (const chunk of stream) {
            if (abortSignal?.aborted) {
                 if (prefixAdded) {
                    appendMessageToChatLog(currentAiResponse + "\n<em>(Chat encerrado ou IA trocada)</em>", 'ai', currentActiveAIProfile, false, aiMessageElement);
                } else {
                    aiMessageElement.remove();
                }
                break;
            }
            const text = chunk.text;
             if (text) {
                if (!prefixAdded) {
                    aiMessageElement.innerHTML = ''; 
                    prefixAdded = true;
                }
                currentAiResponse += text;
                const formattedText = formatResponseForDisplay(currentAiResponse);
                const timestampStr = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                aiMessageElement.innerHTML = `${prefixHTML}${formattedText}<span class="message-timestamp">${timestampStr}</span>`;
            } else if (!prefixAdded && currentAiResponse === '') {
                 aiMessageElement.innerHTML = prefixHTML;
                 const thinkingSpan = document.createElement('span');
                 thinkingSpan.classList.add('thinking-animation');
                 thinkingSpan.textContent = '...';
                 aiMessageElement.appendChild(thinkingSpan);
                 prefixAdded = true;
            }
            if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
        }

        if (abortSignal?.aborted) {
            // Handled
        } else if (!prefixAdded || currentAiResponse.trim() === '') {
            currentAiResponse = currentAiResponse.trim() === '' && prefixAdded ? "IA respondeu com conteúdo vazio." : "Não houve resposta da IA.";
            appendMessageToChatLog(currentAiResponse, 'ai', currentActiveAIProfile, false, aiMessageElement);
        } else {
            appendMessageToChatLog(currentAiResponse, 'ai', currentActiveAIProfile, false, aiMessageElement);
        }
        if (prefixAdded && !abortSignal?.aborted) {
             logInteraction(currentActiveAIProfile, 'chat message received', currentAiResponse);
        }

    } catch (error) {
        if (abortSignal?.aborted) {
            // Handled
        } else {
            console.error('Error sending message:', error);
            if(aiMessageElement.parentNode) aiMessageElement.remove();
            displayErrorMessage(`Erro na comunicação com ${currentActiveAIProfile!.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    } finally {
        if (!abortSignal?.aborted) {
             chatInput.disabled = false;
             sendButton.disabled = false;
             if(document.activeElement !== chatInput) chatInput.focus(); 
        }
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
});

endChatButton?.addEventListener('click', () => {
    resetChatUI(true);
});

// --- Export Functions ---
function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

exportHistoryJsonButton?.addEventListener('click', () => {
    if (!currentActiveAIProfile) {
        displayErrorMessage("Nenhuma IA ativa para exportar o histórico.");
        return;
    }
    const history = loadChatHistory(currentActiveAIProfile);
    if (history.length === 0) {
        displayErrorMessage("Não há histórico para exportar.");
        return;
    }
    try {
        const jsonData = JSON.stringify(history, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        triggerDownload(blob, `chat-history-${currentActiveAIProfile.id}-${new Date().toISOString().split('T')[0]}.json`);
        logInteraction(currentActiveAIProfile, 'history export', `JSON format - ${history.length} messages`);
    } catch (error) {
        console.error("Error exporting history to JSON:", error);
        displayErrorMessage("Falha ao exportar histórico para JSON.");
    }
});

exportHistoryMdButton?.addEventListener('click', () => {
    if (!currentActiveAIProfile) {
        displayErrorMessage("Nenhuma IA ativa para exportar o histórico.");
        return;
    }
    const history = loadChatHistory(currentActiveAIProfile);
    if (history.length === 0) {
        displayErrorMessage("Não há histórico para exportar.");
        return;
    }
    try {
        let mdContent = `# Histórico de Chat com ${currentActiveAIProfile.name} (${currentActiveAIProfile.fullName})\n\n`;
        history.forEach(msg => {
            const senderName = msg.sender === 'user' ? 'Usuário' : (currentActiveAIProfile?.name || 'IA');
            const timestamp = new Date(msg.timestamp).toLocaleString('pt-BR');
            let textForMd = msg.text;
            // Basic conversion from <br> to \n for Markdown, and strip other HTML for plain text in MD.
            textForMd = textForMd.replace(/<br\s*\/?>/gi, '\n');
            const tempDiv = document.createElement('div'); // To help strip HTML tags
            tempDiv.innerHTML = textForMd;
            textForMd = tempDiv.textContent || tempDiv.innerText || "";
            
            mdContent += `**${senderName}** (_${timestamp}_):\n${textForMd}\n\n---\n\n`;
        });
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        triggerDownload(blob, `chat-history-${currentActiveAIProfile.id}-${new Date().toISOString().split('T')[0]}.md`);
        logInteraction(currentActiveAIProfile, 'history export', `Markdown format - ${history.length} messages`);
    } catch (error) {
        console.error("Error exporting history to Markdown:", error);
        displayErrorMessage("Falha ao exportar histórico para Markdown.");
    }
});

exportHistoryPdfButton?.addEventListener('click', async () => {
    if (!currentActiveAIProfile) {
        displayErrorMessage("Nenhuma IA ativa para exportar o histórico.");
        return;
    }
    const history = loadChatHistory(currentActiveAIProfile);
    if (history.length === 0) {
        displayErrorMessage("Não há histórico para exportar.");
        return;
    }

    exportHistoryPdfButton.disabled = true;
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    clearErrorMessage();

    try {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        
        doc.setFont('Helvetica', 'normal'); // Set a standard font

        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        let yPos = margin;

        doc.setFontSize(16);
        doc.text(`Histórico de Chat com ${currentActiveAIProfile.name} (${currentActiveAIProfile.fullName})`, margin, yPos);
        yPos += 10;
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        for (const msg of history) {
            const senderName = msg.sender === 'user' ? 'Usuário' : (currentActiveAIProfile?.name || 'IA');
            const timestamp = new Date(msg.timestamp).toLocaleString('pt-BR');
            
            let textForPdf = msg.text;
            // Convert <br> to \n for jsPDF, and strip other HTML
            textForPdf = textForPdf.replace(/<br\s*\/?>/gi, '\n');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textForPdf; // Basic HTML stripping
            textForPdf = tempDiv.textContent || tempDiv.innerText || "";


            doc.setFontSize(10);
            doc.setFont('Helvetica', 'bold');
            const senderLine = `${senderName}:`;
            const senderTextWidth = doc.getTextWidth(senderLine);
            
            doc.setFontSize(8);
            doc.setFont('Helvetica', 'italic');
            const timestampLine = `(${timestamp})`;
            const timestampWidth = doc.getTextWidth(timestampLine);

            if (yPos + 5 > pageHeight - margin) { // Check for new page before sender line
                doc.addPage();
                yPos = margin;
            }
            doc.setFontSize(10);
            doc.setFont('Helvetica', 'bold');
            doc.text(senderLine, margin, yPos);

            doc.setFontSize(8);
            doc.setFont('Helvetica', 'italic');
            doc.text(timestampLine, margin + senderTextWidth + 2, yPos);
            yPos += 6; 

            doc.setFontSize(10);
            doc.setFont('Helvetica', 'normal');
            const textLines = doc.splitTextToSize(textForPdf, pageWidth - (2 * margin));
            
            for (const line of textLines) {
                if (yPos + 4 > pageHeight - margin) { // Check for new page for each line of text
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 4; // Line height
            }
            yPos += 6; // Extra space after message
        }

        doc.save(`chat-history-${currentActiveAIProfile.id}-${new Date().toISOString().split('T')[0]}.pdf`);
        logInteraction(currentActiveAIProfile, 'history export', `PDF format - ${history.length} messages`);
    } catch (error) {
        console.error("Error exporting history to PDF:", error);
        displayErrorMessage("Falha ao exportar histórico para PDF. Verifique o console.");
    } finally {
        exportHistoryPdfButton.disabled = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
});


// --- Conversation Summarization ---
summarizeChatButton?.addEventListener('click', async () => {
    if (!currentActiveAIProfile) {
        displayErrorMessage("Nenhuma IA ativa para sumarizar a conversa.");
        return;
    }
    const history = loadChatHistory(currentActiveAIProfile);
    if (history.length === 0) {
        displayErrorMessage("Não há histórico para sumarizar.");
        return;
    }

    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    clearErrorMessage();
    summarizeChatButton.disabled = true;

    let conversationText = "Histórico da Conversa Anterior:\n\n";
    history.forEach(msg => {
        const senderName = msg.sender === 'user' ? 'Usuário' : (currentActiveAIProfile?.name || 'IA');
        let textForSummary = msg.text.replace(/<br\s*\/?>/gi, '\n');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = textForSummary;
        textForSummary = tempDiv.textContent || tempDiv.innerText || "";
        conversationText += `${senderName}: ${textForSummary}\n\n`;
    });

    const summarizationPrompt = `Você é um assistente perito em sumarização. Com base no seguinte histórico de conversa, por favor, gere um resumo conciso em português destacando os pontos chave, decisões tomadas (se houver) e próximos passos (se aplicável). Formate o resumo de forma clara e legível:\n\n${conversationText}`;
    
    logInteraction(currentActiveAIProfile, 'summary request', summarizationPrompt);

    const localAbortController = new AbortController(); 
    let currentSummaryResponse = '';
    let prefixAdded = false;
    const summaryMessageElement = document.createElement('div'); // This will be passed to appendMessageToChatLog
    summaryMessageElement.classList.add('chat-message', 'summary-message');

     if (chatLog) {
        const thinkingSpan = document.createElement('span');
        thinkingSpan.classList.add('thinking-animation');
        thinkingSpan.textContent = '...';
        summaryMessageElement.appendChild(thinkingSpan);
        chatLog.appendChild(summaryMessageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    const summaryDisplayName = `Resumo da Conversa (${currentActiveAIProfile.name})`;
    const prefixHTML = `<strong>${summaryDisplayName}:</strong><br>`;


    try {
        const stream = await ai.models.generateContentStream({
            model: currentActiveAIProfile.model, 
            contents: summarizationPrompt,
        });

        for await (const chunk of stream) {
            if (localAbortController.signal.aborted) {
                if(prefixAdded) {
                     appendMessageToChatLog(currentSummaryResponse + "\n<em>(Sumarização cancelada)</em>", 'summary', currentActiveAIProfile, false, summaryMessageElement);
                } else {
                    summaryMessageElement.remove();
                }
                break;
            }
            const text = chunk.text;
            if (text) {
                if (!prefixAdded) {
                    summaryMessageElement.innerHTML = '';
                    prefixAdded = true;
                }
                currentSummaryResponse += text;
                const formattedText = formatResponseForDisplay(currentSummaryResponse);
                const timestampStr = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                summaryMessageElement.innerHTML = `${prefixHTML}${formattedText}<span class="message-timestamp">${timestampStr}</span>`;
            } else if (!prefixAdded && currentSummaryResponse === '') {
                 summaryMessageElement.innerHTML = prefixHTML;
                 const thinkingSpan = document.createElement('span');
                 thinkingSpan.classList.add('thinking-animation');
                 thinkingSpan.textContent = '...';
                 summaryMessageElement.appendChild(thinkingSpan);
                 prefixAdded = true;
            }
            if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
        }
        
        if (localAbortController.signal.aborted) {
            // Already handled
        } else if (!prefixAdded || currentSummaryResponse.trim() === '') {
            currentSummaryResponse = currentSummaryResponse.trim() === '' && prefixAdded ? "IA não conseguiu gerar um resumo ou respondeu com conteúdo vazio." : "Não houve resposta da IA para a sumarização.";
             appendMessageToChatLog(currentSummaryResponse, 'summary', currentActiveAIProfile, false, summaryMessageElement);
        } else {
            appendMessageToChatLog(currentSummaryResponse, 'summary', currentActiveAIProfile, false, summaryMessageElement);
        }

        if (prefixAdded && !localAbortController.signal.aborted) {
            logInteraction(currentActiveAIProfile, 'summary received', currentSummaryResponse);
        }

    } catch (error) {
        console.error("Error generating summary:", error);
        if(summaryMessageElement.parentNode) summaryMessageElement.remove();
        displayErrorMessage(`Erro ao gerar resumo: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        summarizeChatButton.disabled = false;
    }
});


// --- Prompt Template Functions ---
function getPromptTemplateStorageKey(profileId: string): string {
    return `foundlab-prompt-templates-${profileId}`;
}

function loadPromptTemplates(profile: AIProfile): PromptTemplate[] {
    try {
        const templatesJson = localStorage.getItem(getPromptTemplateStorageKey(profile.id));
        return templatesJson ? JSON.parse(templatesJson) : [];
    } catch (error) {
        console.error(`Error loading prompt templates for ${profile.name}:`, error);
        return [];
    }
}

function savePromptTemplate(profile: AIProfile, template: PromptTemplate): PromptTemplate[] {
    try {
        const templates = loadPromptTemplates(profile);
        const existingIndex = templates.findIndex(t => t.name === template.name);
        if (existingIndex > -1) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }
        localStorage.setItem(getPromptTemplateStorageKey(profile.id), JSON.stringify(templates));
        return templates;
    } catch (error) {
        console.error(`Error saving prompt template for ${profile.name}:`, error);
        return loadPromptTemplates(profile); 
    }
}

function populateTemplateDropdown(profile: AIProfile, selectElement: HTMLSelectElement, customPromptTextarea: HTMLTextAreaElement) {
    const templates = loadPromptTemplates(profile);
    selectElement.innerHTML = '<option value="">Selecionar template...</option>'; 
    templates.forEach((template, index) => {
        const option = document.createElement('option');
        option.value = String(index); 
        option.textContent = template.name;
        selectElement.appendChild(option);
    });

    selectElement.onchange = () => {
        const selectedIndex = parseInt(selectElement.value, 10);
        if (!isNaN(selectedIndex) && templates[selectedIndex]) {
            customPromptTextarea.value = templates[selectedIndex].prompt;
        } else {
            customPromptTextarea.value = ''; 
        }
    };
}


function renderAICard(profile: AIProfile): HTMLElement {
    const card = document.createElement('div');
    card.className = 'ai-card';
    card.setAttribute('data-ai-id', profile.id);
    card.setAttribute('aria-labelledby', `ai-name-${profile.id}`);
    card.setAttribute('aria-describedby', `ai-role-${profile.id} ai-prompt-desc-${profile.id}`);

    card.innerHTML = `
        <h3 id="ai-name-${profile.id}" class="ai-name">${profile.name} – ${profile.fullName}</h3>
        <p id="ai-role-${profile.id}" class="ai-role">${profile.role}</p>
        <p class="ai-prompt-label">Instrução base (resumo):</p>
        <p id="ai-prompt-desc-${profile.id}" class="ai-prompt-text">"${formatResponseForDisplay(profile.basePrompt.substring(0, 100))}${profile.basePrompt.length > 100 ? '...' : ''}"</p>
        
        <div class="custom-prompt-section">
            <label for="custom-prompt-input-${profile.id}" class="custom-prompt-label">Prompt Customizado (para execução única):</label>
            <textarea id="custom-prompt-input-${profile.id}" class="custom-prompt-input" rows="3" placeholder="Opcional: Digite um prompt para execução única..."></textarea>
        </div>

        <div class="prompt-template-section">
            <label for="prompt-template-select-${profile.id}" class="prompt-template-label">Templates de Prompt:</label>
            <div class="prompt-template-controls">
                <select id="prompt-template-select-${profile.id}" class="prompt-template-select">
                    <option value="">Selecionar template...</option>
                </select>
                <button id="save-template-btn-${profile.id}" class="save-template-button" title="Salvar prompt customizado atual como template">Salvar Template</button>
            </div>
        </div>

        <div class="card-actions">
            <button class="ai-action-button activate-ai-button" aria-controls="ai-interaction-area">
                Ativar IA (Chat)
            </button>
            <button class="ai-action-button custom-prompt-execute-button" aria-controls="ai-interaction-area">
                Executar Customizado
            </button>
        </div>
    `;

    const activateButton = card.querySelector('.activate-ai-button') as HTMLButtonElement;
    const customExecuteButton = card.querySelector('.custom-prompt-execute-button') as HTMLButtonElement;
    const customPromptTextarea = card.querySelector(`#custom-prompt-input-${profile.id}`) as HTMLTextAreaElement;
    const templateSelect = card.querySelector(`#prompt-template-select-${profile.id}`) as HTMLSelectElement;
    const saveTemplateButton = card.querySelector(`#save-template-btn-${profile.id}`) as HTMLButtonElement;

    populateTemplateDropdown(profile, templateSelect, customPromptTextarea);
    
    activateButton.addEventListener('click', (e) => {
        e.stopPropagation();
        activateAI(profile);
    });

    customExecuteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const customPromptValue = customPromptTextarea.value.trim();
        if (customPromptValue) {
            executeCustomPrompt(profile, customPromptValue);
        } else {
            customPromptTextarea.focus();
            const originalBorder = customPromptTextarea.style.borderColor;
            customPromptTextarea.style.borderColor = 'var(--error-color)';
            setTimeout(() => {
                customPromptTextarea.style.borderColor = originalBorder;
            }, 2000);
        }
    });

    saveTemplateButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptText = customPromptTextarea.value.trim();
        if (!promptText) {
            alert("O campo de prompt customizado está vazio. Digite um prompt para salvar.");
            customPromptTextarea.focus();
            return;
        }
        const templateName = window.prompt("Digite um nome para este template:", "");
        if (templateName && templateName.trim() !== "") {
            savePromptTemplate(profile, { name: templateName.trim(), prompt: promptText });
            populateTemplateDropdown(profile, templateSelect, customPromptTextarea); 
            const templates = loadPromptTemplates(profile);
            const newTemplateIndex = templates.findIndex(t => t.name === templateName.trim() && t.prompt === promptText);
            if(newTemplateIndex > -1) templateSelect.value = String(newTemplateIndex);

        } else if (templateName !== null) { 
            alert("Nome do template não pode ser vazio.");
        }
    });


    return card;
}

async function initializeLobby() {
    if (!cardsContainer) {
        console.error('Cards container (#ai-cards-container) not found in the DOM.');
        displayErrorMessage("Erro crítico: Elemento #ai-cards-container não encontrado.", true);
        return;
    }

    try {
        const response = await fetch('aiProfiles.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allAIProfiles = await response.json();
    } catch (error) {
        console.error('Failed to load AI profiles:', error);
        displayErrorMessage(`Erro ao carregar perfis de IA: ${error instanceof Error ? error.message : String(error)}. Verifique o arquivo aiProfiles.json.`, true);
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const requestedIAIdentifier = urlParams.get('ia')?.toLowerCase();
    let profilesToRender = allAIProfiles;
    let autoActivateProfile: AIProfile | null = null;

    if (requestedIAIdentifier) {
        const foundProfile = allAIProfiles.find(p => p.fullName.toLowerCase() === requestedIAIdentifier || p.id.toLowerCase() === requestedIAIdentifier);
        if (foundProfile) {
            profilesToRender = [foundProfile];
            autoActivateProfile = foundProfile; 
            console.log(`[FoundLab IA Lobby] Carregando perfil específico via URL: ${foundProfile.fullName}`);
        } else {
            console.warn(`[FoundLab IA Lobby] Perfil de IA "${requestedIAIdentifier}" solicitado via URL não encontrado. Carregando todos.`);
            displayErrorMessage(`Perfil de IA "${requestedIAIdentifier}" não encontrado. Verifique o parâmetro 'ia' ou o arquivo aiProfiles.json. Carregando todos os perfis.`, false);
        }
    }
    
    cardsContainer.innerHTML = ''; 
    renderedAICards = []; 

    if (profilesToRender.length === 0 && requestedIAIdentifier) {
         displayErrorMessage(`Nenhum perfil de IA encontrado para "${requestedIAIdentifier}". Verifique o parâmetro 'ia' na URL ou o arquivo aiProfiles.json.`, true);
    } else if (allAIProfiles.length === 0 && profilesToRender.length === 0) {
        displayErrorMessage(`Nenhum perfil de IA encontrado no arquivo aiProfiles.json.`, true);
    }


    profilesToRender.forEach(profile => {
        const cardElement = renderAICard(profile);
        cardsContainer.appendChild(cardElement);
        renderedAICards.push(cardElement);
    });
    
    resetChatUI(true); 

    if (autoActivateProfile) { 
        activateAI(autoActivateProfile);
    }
}

document.addEventListener('DOMContentLoaded', initializeLobby);

chatInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chatForm?.requestSubmit();
    }
});
