const API_URL = 'http://localhost:3000';

async function login() {
    const username = document.getElementById('username').value;

    const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
    });

    const data = await response.json();
    localStorage.setItem('token', data.token);
    showNotesInterface();
}

function showNotesInterface() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('notes').style.display = 'block';
    loadNotes();
}

async function addNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        body: JSON.stringify({ title, content }),
    });

    const data = await response.json();
    console.log(data);
    loadNotes();
}

async function loadNotes() {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/notes`, {
        headers: {
            'Authorization': token,
        },
    });

    const data = await response.json();
    const noteList = document.getElementById('note-list');
    noteList.innerHTML = '';

    data.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content}</p>
      <button class="edit-note" data-id="${note._id}">Edit</button>
      <button class="delete-note" data-id="${note._id}">Delete</button>
    `;
        noteList.appendChild(noteElement);
    });

    document.querySelectorAll('.edit-note').forEach(button => {
        button.addEventListener('click', editNote);
    });

    document.querySelectorAll('.delete-note').forEach(button => {
        button.addEventListener('click', deleteNote);
    });
}

async function editNote(event) {
    const noteId = event.target.dataset.id;
    const newTitle = prompt('Enter new title:');
    const newContent = prompt('Enter new content:');
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        body: JSON.stringify({ title: newTitle, content: newContent }),
    });

    const data = await response.json();
    console.log(data);
    loadNotes();
}

async function deleteNote(event) {
    const noteId = event.target.dataset.id;
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token,
        },
    });

    const data = await response.json();
    console.log(data);
    loadNotes();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

let recognition = null;

function startRecording() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Web Speech API is not supported by this browser. Please upgrade to Chrome.');
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ru-RU';

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('note-content').value = transcript;
    };

    recognition.start();
}

document.getElementById('login').addEventListener('click', login);
document.getElementById('add-note').addEventListener('click', addNote);
document.getElementById('start-recording').addEventListener('click', startRecording);
document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    showNotesInterface();
} else {
    document.getElementById('auth').style.display = 'block';
}