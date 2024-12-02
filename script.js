const API_URL = 'http://localhost:3000';

const resources = {
  en: {
    translation: {
      "title": "Smart Notes",
      "login": "Login",
      "username": "Username",
      "addNote": "Add Note",
      "noteTitle": "Note Title",
      "noteContent": "Note Content",
      "save": "Save",
      "delete": "Delete",
      "search": "Search",
      "startRecording": "Start Recording",
      "toggleDarkMode": "Toggle Dark Mode",
      "tags": "Tags (comma separated)",
      "sortByLastUpdated": "Sort by Last Updated",
      "sortByCreationDate": "Sort by Creation Date",
      "sortByTitle": "Sort by Title",
      "noteContentRequired": "Note content cannot be empty.",
      "logout": "Logout"
    }
  },
  ru: {
    translation: {
      "title": "Умные заметки",
      "login": "Войти",
      "username": "Имя пользователя",
      "addNote": "Добавить заметку",
      "noteTitle": "Заголовок заметки",
      "noteContent": "Содержание заметки",
      "save": "Сохранить",
      "delete": "Удалить",
      "search": "Поиск",
      "startRecording": "Начать запись",
      "toggleDarkMode": "Переключить темный режим",
      "tags": "Теги (через запятую)",
      "sortByLastUpdated": "Сортировка по последнему обновлению",
      "sortByCreationDate": "Сортировка по дате создания",
      "sortByTitle": "Сортировка по заголовку",
      "noteContentRequired": "Содержание заметки не может быть пустым.",
      "logout": "Выйти"
    }
  }
};

i18next.init({
    lng: 'en',
    resources: resources
}, function(err, t) {
    // Инициализация jQuery i18next
    jqueryI18next.init(i18next, $);
    // Локализуем элементы после инициализации
    $('.nav').localize();
    updateTranslations();
});

$('#languageToggle').click(function() {
  const currentLang = i18next.language;
  const newLang = currentLang === 'en' ? 'ru' : 'en';
  i18next.changeLanguage(newLang, () => {
    updateTranslations();
  });
});

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key.startsWith('[placeholder]')) {
      element.placeholder = i18next.t(key.slice(13)); // Изменено с 12 на 13
    } else {
      element.textContent = i18next.t(key);
    }
  });
  updateLanguageIndicator();
}

function updateLanguageIndicator() {
  const languageToggle = document.getElementById('languageToggle');
  languageToggle.textContent = i18next.language === 'en' ? 'EN' : 'RU';
  languageToggle.classList.remove('en', 'ru');
  languageToggle.classList.add(i18next.language);
}

async function login() {
    try {
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            alert('Username is required');
            return;
        }

        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username }),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        console.log('Login successful:', data);
        showNotesInterface();
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to login. Please try again.');
    }
}

function showNotesInterface() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You need to log in first.');
        return;
    }
    document.getElementById('auth').style.display = 'none';
    document.getElementById('notes').style.display = 'block';
    loadNotes();
}

async function addNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const tags = document.getElementById('note-tags').value.split(',').map(tag => tag.trim());
    const attachments = document.getElementById('note-attachments').files;
    const token = localStorage.getItem('token');

    if (!content) {
        alert(i18next.t('noteContentRequired'));
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tags', JSON.stringify(tags));
    
    for (let i = 0; i < attachments.length; i++) {
        formData.append('attachments', attachments[i]);
    }

    console.log('Form data being sent:', {
        title,
        content,
        tags,
        attachments: Array.from(attachments).map(file => file.name) // Логируем имена файлов
    });

    try {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: {
                'Authorization': token,
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json(); // Получаем данные об ошибке
            throw new Error(errorData.message || 'Failed to create note');
        }

        const data = await response.json();
        console.log('Note created:', data);
        loadNotes();
    } catch (error) {
        console.error('Error creating note:', error);
        alert('Failed to create note. Please try again.');
    }
}

async function loadNotes(sortBy = 'updatedAt') {
    const token = localStorage.getItem('token');

    console.log('Loading notes with sortBy:', sortBy); // Логируем параметр сортировки

    try {
        const response = await fetch(`${API_URL}/notes?sortBy=${sortBy}`, {
            headers: {
                'Authorization': token,
            },
        });

        if (!response.ok) {
            const errorData = await response.json(); // Получаем данные об ошибке
            throw new Error(errorData.message || 'Failed to load notes');
        }

        const data = await response.json();
        console.log('Server response:', data); // Добавим эту строку для отладки

        if (Array.isArray(data)) {
            displayNotes(data);
        } else if (data && Array.isArray(data.notes)) {
            displayNotes(data.notes);
        } else {
            console.error('Unexpected response format:', data);
            alert('Failed to load notes. Unexpected response format.');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        alert('Failed to load notes. Please try again.');
    }
}

function displayNotes(notes) {
    const noteList = document.getElementById('note-list');
    noteList.innerHTML = '';

    if (!Array.isArray(notes)) {
        console.error('Notes is not an array:', notes);
        return;
    }

    notes.forEach(note => {
        console.log('Displaying note:', note);
        const noteElement = document.createElement('div');
        noteElement.innerHTML = `
            ${note.title ? `<h3>${note.title}</h3>` : ''}
            <p>${note.content || 'No content'}</p>
            <p>${i18next.t('tags')}: ${note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'No tags'}</p>
            <div class="attachments">
                ${note.attachments && Array.isArray(note.attachments) ? note.attachments.map(attachment => `
                    <div class="attachment">
                        <a href="#" class="attachment-link" 
                           data-note-id="${note._id}" 
                           data-attachment-id="${attachment._id}"
                           data-filename="${attachment.filename}"
                           data-content-type="${attachment.contentType}">
                            ${attachment.filename}
                        </a>
                        <button class="delete-attachment" data-note-id="${note._id}" data-attachment-id="${attachment._id}">
                            ${i18next.t('delete')}
                        </button>
                    </div>
                `).join('') : ''}
            </div>
            <button class="edit-note" data-id="${note._id}">${i18next.t('save')}</button>
            <button class="delete-note" data-id="${note._id}">${i18next.t('delete')}</button>
        `;
        noteList.appendChild(noteElement);
    });

    // Добавляем обработчики событий
    document.querySelectorAll('.edit-note').forEach(button => {
        button.addEventListener('click', editNote);
    });
    document.querySelectorAll('.delete-note').forEach(button => {
        button.addEventListener('click', deleteNote);
    });
    document.querySelectorAll('.delete-attachment').forEach(button => {
        button.addEventListener('click', deleteAttachment);
    });
    document.querySelectorAll('.attachment-link').forEach(link => {
        link.addEventListener('click', openAttachment);
    });
}

// Добавим новую функцию для открытия файлов
async function openAttachment(event) {
    event.preventDefault();
    const noteId = event.target.dataset.noteId;
    const attachmentId = event.target.dataset.attachmentId;
    const filename = event.target.dataset.filename;
    const contentType = event.target.dataset.contentType;
    const token = localStorage.getItem('token');

    try {
        console.log('Attempting to download:', {
            noteId,
            attachmentId,
            filename,
            contentType
        });

        const response = await fetch(`${API_URL}/notes/${noteId}/attachments/${attachmentId}/download`, {
            headers: {
                'Authorization': token,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to download attachment');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Создаем временную ссылку для скачивания файла
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        alert('Failed to download attachment. Please try again.');
    }
}

async function editNote(event) {
    const noteId = event.target.dataset.id;
    const noteElement = event.target.closest('div');
    const currentTitle = noteElement.querySelector('h3').textContent;
    const currentContent = noteElement.querySelector('p').textContent;
    const currentTags = noteElement.querySelector('p:nth-child(3)').textContent.replace(`${i18next.t('tags')}: `, '');

    const newTitle = prompt(i18next.t('noteTitle'), currentTitle);
    const newContent = prompt(i18next.t('noteContent'), currentContent);
    const newTags = prompt(i18next.t('tags'), currentTags).split(',').map(tag => tag.trim());
    const token = localStorage.getItem('token');

    if (!newTitle || !newContent) {
        alert(i18next.t('noteTitle') + ' and ' + i18next.t('noteContent') + ' cannot be empty.');
        return;
    }

    const response = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        body: JSON.stringify({ title: newTitle, content: newContent, tags: newTags }),
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
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.classList.toggle('dark-mode');
    }
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
    recognition.lang = i18next.language === 'en' ? 'en-US' : 'ru-RU';

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('note-content').value = transcript;
    };

    recognition.start();
}

async function searchNotes() {
    const query = document.getElementById('search-note').value;
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/notes/search?query=${encodeURIComponent(query)}`, {
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
      <p>${i18next.t('tags')}: ${note.tags.join(', ')}</p>
      <button class="edit-note" data-id="${note._id}">${i18next.t('save')}</button>
      <button class="delete-note" data-id="${note._id}">${i18next.t('delete')}</button>
    `;
        noteList.appendChild(noteElement);
    });
}

async function deleteAttachment(event) {
    const noteId = event.target.dataset.noteId;
    const attachmentId = event.target.dataset.attachmentId;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/notes/${noteId}/attachments/${attachmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete attachment');
        }

        loadNotes();
    } catch (error) {
        console.error('Error deleting attachment:', error);
        alert('Failed to delete attachment. Please try again.');
    }
}

document.getElementById('login').addEventListener('click', login);
document.getElementById('add-note').addEventListener('click', addNote);
document.getElementById('start-recording').addEventListener('click', startRecording);
document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);
document.getElementById('search-note').addEventListener('input', searchNotes);

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    showNotesInterface();
} else {
    document.getElementById('auth').style.display = 'block';
}

updateTranslations();

// Добавьте выпадающий список для сортировки
const sortSelect = document.createElement('select');
sortSelect.innerHTML = `
    <option value="updatedAt">${i18next.t('sortByLastUpdated')}</option>
    <option value="createdAt">${i18next.t('sortByCreationDate')}</option>
    <option value="title">${i18next.t('sortByTitle')}</option>
`;
sortSelect.addEventListener('change', (e) => loadNotes(e.target.value));
document.querySelector('.nav').appendChild(sortSelect);

// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        showNotesInterface();
    } else {
        document.getElementById('auth').style.display = 'block';
        document.getElementById('notes').style.display = 'none';
    }
});

// Добавим функцию logout
function logout() {
    localStorage.removeItem('token');
    document.getElementById('auth').style.display = 'block';
    document.getElementById('notes').style.display = 'none';
    document.getElementById('username').value = '';
}

// Добавим обработчик события для кнопки выхода
document.getElementById('logout').addEventListener('click', logout);
