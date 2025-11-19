class ChatApp {
    constructor() {
        this.ws = null;
        this.currentRoom = null;
        this.currentUsername = null;
        this.isConnected = false;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Landing panel elements
        this.landingPanel = document.getElementById('landing-panel');
        this.joinForm = document.getElementById('join-form');
        this.roomNameInput = document.getElementById('room-name');
        this.usernameInput = document.getElementById('username');
        this.joinBtn = document.getElementById('join-btn');

        // Chat container elements
        this.chatContainer = document.getElementById('chat-container');
        this.currentRoomDisplay = document.getElementById('current-room');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        this.statusText = document.getElementById('status-text');
        this.usersList = document.getElementById('users-list');
        this.messagesPane = document.getElementById('messages-pane');
        this.messageForm = document.getElementById('message-form');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
    }

    bindEvents() {
        // Join form submission
        this.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinRoom();
        });
        
        // Message form submission
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // Send message on Enter (but allow Shift+Enter for new line)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async joinRoom() {
        const roomName = this.roomNameInput.value.trim();
        const username = this.usernameInput.value.trim();
        
        if (!roomName || !username) {
            alert('Please enter both room name and username');
            return;
        }
        
        this.currentRoom = roomName;
        this.currentUsername = username;
        
        // Disable form while connecting
        this.joinBtn.disabled = true;
        this.joinBtn.textContent = 'Connecting...';
        
        try {
            await this.connectWebSocket();
            this.switchToChat();
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Failed to connect to the chat room. Please try again.');
            this.joinBtn.disabled = false;
            this.joinBtn.textContent = 'Join Room';
        }
    }

    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/${this.currentRoom}/${this.currentUsername}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.ws.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.addSystemMessage('Connection closed. Please refresh to reconnect.');
            };
            
            this.ws.onerror = (error) => {
                reject(error);
            };
            
            // Set a timeout for connection
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    switchToChat() {
        this.landingPanel.style.display = 'none';
        this.chatContainer.style.display = 'flex';
        this.currentRoomDisplay.textContent = `Room: ${this.currentRoom}`;
        this.messageInput.focus();
        
        // Reset body styles for chat view
        document.body.style.alignItems = 'stretch';
        document.body.style.justifyContent = 'stretch';
    }

    updateConnectionStatus(isOnline) {
        if (isOnline) {
            this.statusIndicator.classList.add('online');
            this.statusText.textContent = 'Connected';
        } else {
            this.statusIndicator.classList.remove('online');
            this.statusText.textContent = 'Disconnected';
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'message':
                this.addChatMessage(data.user, data.content);
                break;
            case 'join':
                this.updateUsersList(data.online);
                this.addSystemMessage(`${data.user} joined the room`);
                break;
            case 'leave':
                this.updateUsersList(data.online);
                this.addSystemMessage(`${data.user} left the room`);
                break;
        }
    }

    addChatMessage(username, content) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${username === this.currentUsername ? 'own' : 'other'}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-header">${username} • ${timeString}</div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        const reactionsSpan = document.createElement('span');
        reactionsSpan.className = 'reactions';
        
        // Add emoji picker button
        const emojiPickerBtn = document.createElement('button');
        emojiPickerBtn.className = 'emoji-picker-btn';
        emojiPickerBtn.innerHTML = '+';
        emojiPickerBtn.title = 'Add reaction';
        
        messageContainer.appendChild(messageDiv);
        messageContainer.appendChild(reactionsSpan);
        messageContainer.appendChild(emojiPickerBtn);
        
        // Add hover events for emoji picker
        this.setupEmojiPicker(messageContainer, emojiPickerBtn);
        
        this.messagesPane.appendChild(messageContainer);
        this.scrollToBottom();
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = content;
        
        this.messagesPane.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateUsersList(users) {
        this.usersList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            if (user === this.currentUsername) {
                li.style.fontWeight = 'bold';
            }
            this.usersList.appendChild(li);
        });
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        
        if (!content || !this.isConnected) {
            return;
        }
        
        const message = {
            type: 'message',
            content: content
        };
        
        this.ws.send(JSON.stringify(message));
        this.messageInput.value = '';
        this.autoResizeTextarea();
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 100) + 'px';
    }
    
    scrollToBottom() {
        this.messagesPane.scrollTop = this.messagesPane.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEmojiPicker(messageContainer, emojiPickerBtn) {
        let emojiPickerVisible = false;
        let emojiPicker = null;
        
        // Common emojis for quick reactions
        const commonEmojis = ['🙂', '😂', '❤️', '👍', '🎉', '😮', '😢', '😡', '🤔', '👏'];
        
        const showEmojiPicker = () => {
            if (emojiPickerVisible) return;
            
            // Create emoji picker popup
            emojiPicker = document.createElement('div');
            emojiPicker.className = 'emoji-picker-popup';
            
            commonEmojis.forEach(emoji => {
                const emojiBtn = document.createElement('button');
                emojiBtn.className = 'emoji-btn';
                emojiBtn.textContent = emoji;
                emojiBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.addReaction(messageContainer, emoji);
                    hideEmojiPicker();
                };
                emojiPicker.appendChild(emojiBtn);
            });
            
            // Position the picker
            messageContainer.appendChild(emojiPicker);
            emojiPickerVisible = true;
            
            // Close picker when clicking outside
            setTimeout(() => {
                document.addEventListener('click', hideEmojiPicker, { once: true });
            }, 0);
        };

        const hideEmojiPicker = () => {
            if (emojiPicker && emojiPicker.parentNode) {
                emojiPicker.parentNode.removeChild(emojiPicker);
            }
            emojiPickerVisible = false;
            emojiPicker = null;
        };
        
        // Show emoji picker on button click
        emojiPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emojiPickerVisible) {
                hideEmojiPicker();
            } else {
                showEmojiPicker();
            }
        });
        
        // Show emoji picker button on hover
        messageContainer.addEventListener('mouseenter', () => {
            emojiPickerBtn.style.opacity = '1';
        });
        
        messageContainer.addEventListener('mouseleave', () => {
            if (!emojiPickerVisible) {
                emojiPickerBtn.style.opacity = '0.4';
            }
        });
    }

    addReaction(messageContainer, emoji) {
        // Emit add_reaction event to server
        if (this.isConnected) {
            const message = {
                type: 'add_reaction',
                emoji: emoji,
                messageId: messageContainer.dataset.messageId || Date.now().toString()
            };
            this.ws.send(JSON.stringify(message));
        }
        
        // Optimistically add reaction to UI
        this.displayReaction(messageContainer, emoji, this.currentUsername);
    }

    displayReaction(messageContainer, emoji, username) {
        const reactionsSpan = messageContainer.querySelector('.reactions');
        
        // Check if this emoji already exists
        let existingReaction = reactionsSpan.querySelector(`[data-emoji="${emoji}"]`);
        
        if (existingReaction) {
            // Update count and users
            const countSpan = existingReaction.querySelector('.reaction-count');
            const currentCount = parseInt(countSpan.textContent) || 1;
            countSpan.textContent = currentCount + 1;
        } else {
            // Create new reaction button
            const reactionBtn = document.createElement('button');
            reactionBtn.className = 'reaction-btn';
            reactionBtn.dataset.emoji = emoji;
            reactionBtn.innerHTML = `
                <span class="reaction-emoji">${emoji}</span>
                <span class="reaction-count">1</span>
            `;
            
            // Add click handler to toggle reaction
            reactionBtn.addEventListener('click', () => {
                // TODO: Implement remove reaction functionality
                console.log('Toggle reaction:', emoji);
            });
            
            reactionsSpan.appendChild(reactionBtn);
        }
    }
}
    
    
// Initialize the chat app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});