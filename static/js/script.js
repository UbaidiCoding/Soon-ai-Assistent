// DOM Elements
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const micBtn = document.getElementById('mic-btn');
const mobileMicBtn = document.getElementById('mobile-mic-btn');
const modules = document.querySelectorAll('.module');
const currentTime = document.getElementById('current-time');
const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task-btn');
const globalSearch = document.getElementById('global-search');
const searchBtn = document.getElementById('search-btn');
const menuBtn = document.querySelector('.menu-btn');
const sidebar = document.querySelector('.sidebar');
const closeBtn = document.querySelector('.close-btn');
const addTaskToggle = document.getElementById('add-task-toggle');
const addTaskForm = document.getElementById('add-task-form');
const loadingIndicator = document.getElementById('loading');

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    currentTime.textContent = timeString;
}

setInterval(updateTime, 1000);
updateTime();

// Toggle sidebar on mobile
menuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
});

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

// Toggle add task form
addTaskToggle.addEventListener('click', () => {
    addTaskForm.classList.toggle('visible');
});

// Module switching
modules.forEach(module => {
    module.addEventListener('click', () => {
        modules.forEach(m => m.classList.remove('active'));
        module.classList.add('active');
        
        // Close sidebar on mobile after selection
        if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
        }
        
        // Show module name in chat
        const moduleName = module.querySelector('h4').textContent;
        addMessage(`Switched to ${moduleName} module. How can I assist you?`, 'assistant');
    });
});

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const messageContent = document.createElement('p');
    messageContent.textContent = text;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = `${sender === 'user' ? 'You' : 'SOON'} • ${timeString}`;
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show loading indicator
function showLoading() {
    loadingIndicator.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// Fetch tasks from server
async function fetchTasks() {
    try {
        const response = await fetch('/tasks');
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Render tasks to the UI
function renderTasks(tasks) {
    taskList.innerHTML = '';
    
    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        if (task.completed) taskItem.classList.add('completed');
        taskItem.dataset.id = task.id;
        
        const taskText = document.createElement('div');
        taskText.classList.add('task-text');
        taskText.textContent = task.content;
        
        const taskActions = document.createElement('div');
        taskActions.classList.add('task-actions');
        
        const completeBtn = document.createElement('button');
        completeBtn.title = "Complete";
        completeBtn.innerHTML = '<i class="fas fa-check"></i>';
        completeBtn.addEventListener('click', () => toggleTaskComplete(task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        taskActions.appendChild(completeBtn);
        taskActions.appendChild(deleteBtn);
        
        taskItem.appendChild(taskText);
        taskItem.appendChild(taskActions);
        
        taskList.appendChild(taskItem);
    });
}

// Toggle task completion
async function toggleTaskComplete(id) {
    try {
        const response = await fetch(`/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

// Delete task
async function deleteTask(id) {
    try {
        const response = await fetch(`/tasks/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// Add new task
async function addNewTask() {
    const taskText = newTaskInput.value.trim();
    if (!taskText) return;
    
    try {
        showLoading();
        const response = await fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: taskText })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                fetchTasks();
                addMessage(`Task added: "${taskText}"`, 'assistant');
                newTaskInput.value = '';
                addTaskForm.classList.remove('visible');
            }
        }
    } catch (error) {
        console.error('Error adding task:', error);
    } finally {
        hideLoading();
    }
}

// Process user commands
async function processCommand(command) {
    // Convert to lowercase for easier matching
    const cmd = command.toLowerCase();
    
    showLoading();
    
    try {
        let response = "I'm still learning. Can you rephrase that?";
        
        if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey')) {
            response = "Hello! How can I assist you today?";
        } else if (cmd.includes('time')) {
            response = `The current time is ${new Date().toLocaleTimeString()}.`;
        } else if (cmd.includes('date')) {
            response = `Today is ${new Date().toDateString()}.`;
        } else if (cmd.includes('joke')) {
            const jokeResponse = await fetch('/joke');
            const jokeData = await jokeResponse.json();
            response = jokeData.joke;
        } else if (cmd.includes('search') || cmd.includes('google') || cmd.includes('duckduckgo') || cmd.includes('wiki')) {
            const searchResponse = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: command })
            });
            
            const searchData = await searchResponse.json();
            if (searchData.source === 'wikipedia') {
                response = `Wikipedia says:\n${searchData.result}`;
            } else if (searchData.source === 'google') {
                response = "Top search results:\n";
                searchData.results.forEach((result, index) => {
                    response += `${index + 1}. ${result.title}\n${result.desc}\n\n`;
                });
            } else {
                response = "Sorry, I couldn't find any results for that search.";
            }
        } else if (cmd.includes('remind') || cmd.includes('reminder')) {
            const timeMatch = cmd.match(/\d+/);
            const time = timeMatch ? timeMatch[0] : '30';
            response = `I've set a reminder for ${time} minutes from now. I'll notify you when it's time!`;
        } else if (cmd.includes('task') || cmd.includes('todo')) {
            if (cmd.includes('add') || cmd.includes('create')) {
                const task = command.replace('add', '').replace('task', '').replace('create', '').trim();
                if (task) {
                    await addNewTaskWithText(task);
                    response = `Task added: "${task}"`;
                } else {
                    response = "Please specify a task to add.";
                }
            } else if (cmd.includes('list') || cmd.includes('show')) {
                const tasks = await fetchTasksForDisplay();
                if (tasks.length > 0) {
                    response = "Your tasks:\n";
                    tasks.forEach((task, index) => {
                        response += `${index + 1}. ${task.content}\n`;
                    });
                } else {
                    response = "You have no tasks. Add one with 'add task [description]'";
                }
            } else {
                response = "Do you want to add, list, or complete a task?";
            }
        } else if (cmd.includes('thank')) {
            response = "You're welcome! Is there anything else I can help with?";
        } else if (cmd.includes('speak')) {
            const text = command.replace('speak', '').trim();
            if (text) {
                await fetch('/speak', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text })
                });
                response = "I just said that for you!";
            } else {
                response = "What would you like me to say?";
            }
        } else {
            // Try to get a response from the assistant logic
            response = await getAssistantResponse(command);
        }
        
        addMessage(response, 'assistant');
    } catch (error) {
        console.error('Error processing command:', error);
        addMessage("I encountered an error processing your request. Please try again.", 'assistant');
    } finally {
        hideLoading();
    }
}

// Helper function to add task from command
async function addNewTaskWithText(taskText) {
    try {
        const response = await fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: taskText })
        });
        
        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
}

// Fetch tasks for display in chat
async function fetchTasksForDisplay() {
    try {
        const response = await fetch('/tasks');
        return await response.json();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

// Get assistant response for more complex queries
async function getAssistantResponse(query) {
    // In a real implementation, this would call an AI API
    // For now, we'll use a simple pattern matching approach
    
    if (query.includes('who are you')) {
        return "I'm SOON, your virtual assistant created by SamiUbaidi!";
    } else if (query.includes('what can you do')) {
        return "I can help you with:\n- Managing tasks\n- Setting reminders\n- Web searches\n- Answering questions\n- Telling jokes\n- And much more!";
    } else if (query.includes('github') || query.includes('repository')) {
        return "You can manage your GitHub repositories through me. Try commands like 'create repo', 'list repos', or 'commit changes'.";
    } else if (query.includes('email')) {
        return "I can help you with emails. Try 'read emails', 'compose email', or 'send email to [name]'.";
    }
    
    return "I'm still learning. Can you try asking in a different way?";
}

// Speech recognition
async function startSpeechRecognition() {
    showLoading();
    micBtn.classList.add('listening');
    if (mobileMicBtn) mobileMicBtn.classList.add('listening');
    
    try {
        const response = await fetch('/listen');
        const data = await response.json();
        
        if (data.text) {
            userInput.value = data.text;
            addMessage(data.text, 'user');
            processCommand(data.text);
        } else {
            addMessage("I didn't catch that. Please try again.", 'assistant');
        }
    } catch (error) {
        console.error('Error with speech recognition:', error);
        addMessage("I encountered an error with speech recognition. Please try again.", 'assistant');
    } finally {
        micBtn.classList.remove('listening');
        if (mobileMicBtn) mobileMicBtn.classList.remove('listening');
        hideLoading();
    }
}

// Event listeners
micBtn.addEventListener('click', startSpeechRecognition);
if (mobileMicBtn) mobileMicBtn.addEventListener('click', startSpeechRecognition);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'user');
        processCommand(message);
        userInput.value = '';
    }
});

addTaskBtn.addEventListener('click', addNewTask);
newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewTask();
});

searchBtn.addEventListener('click', () => {
    const query = globalSearch.value.trim();
    if (query) {
        addMessage(`Searching for: "${query}"`, 'user');
        processCommand(`search ${query}`);
        globalSearch.value = '';
    }
});

globalSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Initialize the app
fetchTasks();

// Add welcome message after a short delay
setTimeout(() => {
    addMessage("System initialization complete. All modules are online and ready.", 'assistant');
}, 1000);