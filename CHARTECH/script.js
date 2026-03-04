// ===== FIREBASE CONFIG (compat) =====
const firebaseConfig = {
  apiKey: "AIzaSyCLMupkpdNWZPt4sntDsFvnoyBWVmX5KAc",
  authDomain: "ch-app-b3b94.firebaseapp.com",
  databaseURL: "https://ch-app-b3b94-default-rtdb.firebaseio.com",
  projectId: "ch-app-b3b94",
  storageBucket: "ch-app-b3b94.firebasestorage.app",
  messagingSenderId: "794629229663",
  appId: "1:794629229663:web:bbccbd062bfae7669bdfea",
  measurementId: "G-SE5778C3CM"
};

// Initialisation Firebase (version compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// Le reste de ton code (variables globales, fonctions) reste inchangé...


// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentChatId = null;
let currentChatType = null;
let deepThink = false;
let webSearch = false;
let recorder = null;
let mediaToAnalyze = [];

// ===== GESTION AUTH =====a
window.showAuthTab = function(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelector('.auth-tab[onclick="showAuthTab(\'login\')"]').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab[onclick="showAuthTab(\'register\')"]').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
};

window.register = async function() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const photoFile = document.getElementById('registerPhoto').files[0];

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        let photoURL = '';
        if (photoFile) {
            const ref = storage.ref('profile_pics/' + user.uid);
            await ref.put(photoFile);
            photoURL = await ref.getDownloadURL();
        }
        await db.ref('users/' + user.uid).set({
            name: name,
            email: email,
            photoURL: photoURL || 'default-avatar.png'
        });
        alert('Inscription réussie ! Connecte-toi.');
        showAuthTab('login');
    } catch (error) {
        alert(error.message);
    }
};

window.login = async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        currentUser = cred.user;
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').classList.remove('hidden');
        loadUserProfile();
        loadChats();
        loadGroups();
    } catch (error) {
        alert(error.message);
    }
};

window.logout = async function() {
    await auth.signOut();
    window.location.reload();
};

function loadUserProfile() {
    db.ref('users/' + currentUser.uid).once('value', snap => {
        const data = snap.val();
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profilePic').src = data.photoURL;
    });
}

// ===== ONGLETS PRINCIPAUX =====
window.showMainTab = function(tab) {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.main-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`.sidebar-tab[onclick="showMainTab('${tab}')"]`).classList.add('active');
    document.getElementById(tab + 'Section').classList.add('active');
};

// ===== CHATS =====
async function loadChats() {
    const list = document.getElementById('chatsList');
    list.innerHTML = '';
    const chatsRef = db.ref('userChats/' + currentUser.uid);
    const snap = await chatsRef.once('value');
    if (snap.exists()) {
        snap.forEach(child => {
            const chat = child.val();
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<img src="${chat.otherPhoto || 'default-avatar.png'}"><span>${chat.otherName}</span>`;
            div.onclick = () => openChat('private', child.key, chat.otherName, chat.otherPhoto);
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p>Aucune conversation</p>';
    }
}

async function loadGroups() {
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    const groupsRef = db.ref('userGroups/' + currentUser.uid);
    const snap = await groupsRef.once('value');
    if (snap.exists()) {
        snap.forEach(async child => {
            const groupId = child.key;
            const groupSnap = await db.ref('groups/' + groupId).once('value');
            const group = groupSnap.val();
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<img src="group-icon.png"><span>${group.name}</span>`;
            div.onclick = () => openChat('group', groupId, group.name, null);
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p>Aucun groupe</p>';
    }
}

window.showNewChatModal = function() {
    document.getElementById('newChatModal').classList.remove('hidden');
};

window.showNewGroupModal = function() {
    document.getElementById('newGroupModal').classList.remove('hidden');
};

window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
};

window.startPrivateChat = async function() {
    const email = document.getElementById('newChatEmail').value;
    const userSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (!userSnap.exists()) {
        alert('Utilisateur non trouvé');
        return;
    }
    const otherUid = Object.keys(userSnap.val())[0];
    const otherData = userSnap.val()[otherUid];
    const chatId = [currentUser.uid, otherUid].sort().join('_');
    await db.ref('userChats/' + currentUser.uid + '/' + chatId).set({
        otherUid: otherUid,
        otherName: otherData.name,
        otherPhoto: otherData.photoURL
    });
    await db.ref('userChats/' + otherUid + '/' + chatId).set({
        otherUid: currentUser.uid,
        otherName: currentUser.displayName,
        otherPhoto: currentUser.photoURL
    });
    closeModal();
    loadChats();
};

window.createGroup = async function() {
    const name = document.getElementById('newGroupName').value;
    const emails = document.getElementById('newGroupMembers').value.split(',').map(e => e.trim());
    const members = [currentUser.uid];
    for (let email of emails) {
        const snap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
        if (snap.exists()) {
            members.push(Object.keys(snap.val())[0]);
        }
    }
    const groupId = db.ref('groups').push().key;
    await db.ref('groups/' + groupId).set({
        name: name,
        members: members,
        createdBy: currentUser.uid,
        createdAt: Date.now()
    });
    for (let uid of members) {
        await db.ref('userGroups/' + uid + '/' + groupId).set(true);
    }
    closeModal();
    loadGroups();
};

function openChat(type, id, name, photo) {
    currentChatId = id;
    currentChatType = type;
    document.getElementById('currentChatName').textContent = name;
    document.getElementById('chatArea').classList.remove('hidden');
    document.getElementById('messages').innerHTML = '';

    const refPath = type === 'private' ? 'privateMessages' : 'groupMessages';
    db.ref(refPath + '/' + id).off();
    db.ref(refPath + '/' + id).on('child_added', snap => {
        const msg = snap.val();
        displayMessage(msg);
    });
}

function displayMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.senderUid === currentUser.uid ? 'sent' : 'received'}`;

    if (msg.text) {
        div.textContent = msg.text;
    } else if (msg.imageUrl) {
        const img = document.createElement('img');
        img.src = msg.imageUrl;
        div.appendChild(img);
    } else if (msg.videoUrl) {
        const video = document.createElement('video');
        video.src = msg.videoUrl;
        video.controls = true;
        div.appendChild(video);
    } else if (msg.audioUrl) {
        const audio = document.createElement('audio');
        audio.src = msg.audioUrl;
        audio.controls = true;
        div.appendChild(audio);
    }

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date(msg.timestamp).toLocaleTimeString();
    div.appendChild(time);

    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

window.sendMessage = async function() {
    const text = document.getElementById('messageText').value.trim();
    if (!text && !currentChatId) return;

    const refPath = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
    const msg = {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: Date.now()
    };
    if (text) msg.text = text;

    await db.ref(refPath + '/' + currentChatId).push(msg);
    document.getElementById('messageText').value = '';
};

window.closeChat = function() {
    currentChatId = null;
    document.getElementById('chatArea').classList.add('hidden');
};

// ===== MESSAGES VOCAUX =====
window.startVoiceRecording = function() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            recorder = RecordRTC(stream, { type: 'audio' });
            recorder.startRecording();
            alert('Enregistrement en cours... Parle et reclique sur le micro pour arrêter');
        })
        .catch(err => alert('Microphone non accessible'));
};

window.stopVoiceRecording = async function() {
    recorder.stopRecording(async () => {
        const blob = recorder.getBlob();
        const ref = storage.ref('voice_messages/' + Date.now() + '.wav');
        await ref.put(blob);
        const downloadUrl = await ref.getDownloadURL();

        const refPath = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
        await db.ref(refPath + '/' + currentChatId).push({
            senderUid: currentUser.uid,
            senderName: currentUser.displayName,
            audioUrl: downloadUrl,
            timestamp: Date.now()
        });
    });
};

// Attacher l'arrêt sur le bouton micro (simplifié)
document.querySelector('.message-input button:first-child').addEventListener('click', function() {
    if (recorder && recorder.state === 'recording') {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
});

// ===== IA =====
window.toggleDeepThink = function() {
    deepThink = !deepThink;
    const btn = document.getElementById('deepThinkBtn');
    btn.classList.toggle('active', deepThink);
};

window.toggleWebSearch = function() {
    webSearch = !webSearch;
    const btn = document.getElementById('webSearchBtn');
    btn.classList.toggle('active', webSearch);
};

window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const question = input.value.trim();
    if (!question) return;

    // Afficher la question de l'utilisateur
    addMessageToAI(question, 'user');
    input.value = '';
    document.getElementById('aiThinking').classList.remove('hidden');

    // Préparer les médias
    const mediaFiles = document.getElementById('aiMedia').files;
    const mediaUrls = [];
    for (let file of mediaFiles) {
        const ref = storage.ref('ai_media/' + Date.now() + '_' + file.name);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        mediaUrls.push({ url, type: file.type });
    }

    try {
        // Appel au serveur Python (local)
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question,
                media: mediaUrls,
                deepThink: deepThink,
                webSearch: webSearch,
                language: localStorage.getItem('language') || 'fr'
            })
        });
        const data = await response.json();
        addMessageToAI(data.answer, 'ai');
    } catch (error) {
        console.error(error);
        addMessageToAI('❌ Erreur de connexion au serveur IA. Assure-toi que le serveur Python est lancé.', 'ai');
    }

    document.getElementById('aiThinking').classList.add('hidden');
    document.getElementById('aiMedia').value = '';
};

function addMessageToAI(text, sender) {
    const container = document.getElementById('aiMessages');
    const div = document.createElement('div');
    div.className = `message ${sender === 'user' ? 'sent' : 'received'}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ===== THÈMES ET LANGUE =====
window.setTheme = function(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('theme', theme);
};

window.setLanguage = function(lang) {
    localStorage.setItem('language', lang);
    // Ici tu pourrais changer les textes de l'interface
};

// Charger les préférences
const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);
const savedLang = localStorage.getItem('language');
if (savedLang) setLanguage(savedLang);
