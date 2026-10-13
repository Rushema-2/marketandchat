const API = "http://localhost:3000/api";

const token = localStorage.getItem("token");
const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
);

let socket = null;
let currentConversationId = null;
let myContacts = [];
let conversationsCache = [];


// ===============================
// AUTH CHECK
// ===============================

if (!token || !currentUser) {
    window.location.href = "login.html";
}


// ===============================
// DOM
// ===============================
const userSearchInput =
    document.getElementById("userSearchInput");

const searchResults =
    document.getElementById("searchResults");
const userInfo =
    document.getElementById("userInfo");

const conversationList =
    document.getElementById("conversationList");

    const contactList =
    document.getElementById("contactsList");

const messagesContainer =
    document.getElementById("messages");

const chatTitle =
    document.getElementById("chatTitle");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const logoutBtn =
    document.getElementById("logoutBtn");

    const profileBtn =
    document.getElementById("profileBtn");

const settingsBtn =
    document.getElementById("settingsBtn");

const profilePanel =
    document.getElementById("profilePanel");

const closeProfileBtn =
    document.getElementById("closeProfileBtn");

const profileAvatarLarge =
    document.getElementById("profileAvatarLarge");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const profilePhone =
    document.getElementById("profilePhone");

    const settingsPanel =
    document.getElementById("settingsPanel");

const closeSettingsBtn =
    document.getElementById("closeSettingsBtn");

const accountSettingsBtn =
    document.getElementById("accountSettingsBtn");

const privacySettingsBtn =
    document.getElementById("privacySettingsBtn");

const notificationSettingsBtn =
    document.getElementById("notificationSettingsBtn");

const chatSettingsBtn =
    document.getElementById("chatSettingsBtn");

    const accountPanel =
    document.getElementById("accountPanel");

const closeAccountBtn =
    document.getElementById("closeAccountBtn");

    const accountFirstName =
    document.getElementById("accountFirstName");

const accountLastName =
    document.getElementById("accountLastName");

const accountEmail =
    document.getElementById("accountEmail");

const accountPhone =
    document.getElementById("accountPhone");

    const saveAccountBtn =
    document.getElementById("saveAccountBtn");

    const currentPassword =
    document.getElementById("currentPassword");

const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");

const changePasswordBtn =
    document.getElementById("changePasswordBtn");

    const audioCallButton =
    document.getElementById("audioCallButton");

const videoCallButton =
    document.getElementById("videoCallButton");

const endCallButton =
    document.getElementById("endCallButton");

const callStatus =
    document.getElementById("callStatus");

const callContainer =
    document.getElementById("callContainer");

const remoteVideo =
    document.getElementById("remoteVideo");

    const remoteAudio =
    document.getElementById("remoteAudio");

const localVideo =
    document.getElementById("localVideo");

    // ===============================
// WEBRTC CALL STATE
// ===============================

let peerConnection = null;
let localStream = null;
let currentCallType = null;
let currentCallUserId = null;
let currentCallSocketId = null;
let pendingIceCandidates = [];

if (endCallButton) {
    endCallButton.addEventListener("click", () => {
        console.log("End call button clicked");

        if (socket && currentCallSocketId) {
            socket.emit("endCall", {
                targetSocketId: currentCallSocketId
            });
        }

        cleanupCall();
    });
}

function cleanupCall() {
    console.log("Cleaning up call...");

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localVideo) {
        localVideo.srcObject = null;
    }

    if (remoteVideo) {
        remoteVideo.srcObject = null;

        if (remoteAudio) {
    remoteAudio.srcObject = null;
}
    }

    currentCallType = null;
    currentCallUserId = null;
    currentCallSocketId = null;

    if (callContainer) {
        callContainer.classList.add("hidden");
    }

    if (callStatus) {
        callStatus.innerText = "Call ended";
    }
}

const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

// ===============================
// CREATE PEER CONNECTION
// ===============================

function createPeerConnection() {

    const pc =
        new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {

        if (!event.candidate) {
            return;
        }

        console.log(
            "ICE candidate:",
            event.candidate
        );

        if (!currentCallSocketId) {
            pendingIceCandidates.push(event.candidate);
            console.log("ICE candidate queued");
            return;
        }

        socket.emit("iceCandidate", {
            candidate: event.candidate,
            targetSocketId: currentCallSocketId
        });
    };


   pc.ontrack = (event) => {

    console.log(
        "Remote stream received:",
        event.streams
    );

    if (!event.streams || !event.streams[0]) {
        console.error("No remote stream received");
        return;
    }

    const remoteStream = event.streams[0];

    // Audio call
    if (remoteAudio) {
        remoteAudio.srcObject = remoteStream;

        remoteAudio.play()
            .then(() => {
                console.log("Remote audio playback started");
            })
            .catch(error => {
                console.error(
                    "Remote audio playback failed:",
                    error
                );
            });
    }

    // Video call
    if (remoteVideo) {
        remoteVideo.srcObject = remoteStream;
    }
};


    pc.onconnectionstatechange = () => {

        console.log(
            "WebRTC connection state:",
            pc.connectionState
        );

        if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
        ) {

            console.log(
                "WebRTC connection ended"
            );
        }
    };


    return pc;
}

// ===============================
// GET LOCAL AUDIO
// ===============================

async function getAudioStream() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

        console.log(
            "Microphone access granted"
        );

        return stream;

    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );

        alert(
            "Microphone permission is required for audio calls."
        );

        return null;
    }
}

// ===============================
// START AUDIO CALL
// ===============================

async function startAudioCall(targetUserId) {

    console.log(
        "Starting audio call to:",
        targetUserId
    );

    if (!targetUserId) {

        console.error(
            "No target user ID"
        );

        return;
    }


    currentCallType =
        "audio";

    currentCallUserId =
        targetUserId;


    localStream =
        await getAudioStream();

    if (!localStream) {
        return;
    }


    peerConnection =
        createPeerConnection();


    localStream
        .getTracks()
        .forEach(
            (track) => {

                peerConnection.addTrack(
                    track,
                    localStream
                );

            }
        );


    callContainer.classList.remove(
        "hidden"
    );

    callStatus.innerText =
        "Calling...";


    const offer =
        await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
        offer
    );


    console.log(
        "Sending call offer"
    );


    socket.emit(
        "callOffer",
        {
            targetUserId,
            conversationId: currentConversationId,
            offer,
            callType: "audio"
        }
    );
}

async function startVideoCall(targetUserId) {
    console.log("Starting video call to:", targetUserId);

    if (!targetUserId) {
        console.error("No target user ID");
        return;
    }

    currentCallType = "video";
    currentCallUserId = String(targetUserId);

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });

        console.log("Camera and microphone OK");

        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        peerConnection = createPeerConnection();

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        if (callContainer) {
            callContainer.classList.remove("hidden");
        }

        if (callStatus) {
            callStatus.innerText = "Calling...";
        }

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("callOffer", {
            targetUserId,
            conversationId: currentConversationId,
            offer,
            callType: "video"
        });

    } catch (error) {
        console.error("Video call error:", error);

        if (callStatus) {
            callStatus.innerText = "Video call failed";
        }

        cleanupCall();
    }
}

// ===============================
// AUDIO CALL BUTTON
// ===============================

if (audioCallButton) {

    audioCallButton.addEventListener(
        "click",
        async () => {

            console.log(
                "Audio call button clicked"
            );

            if (!currentConversationId) {

                alert(
                    "Please select a conversation first."
                );

                return;
            }

            if (!currentCallUserId) {

                alert(
                    "No call recipient found."
                );

                return;
            }

            await startAudioCall(
                currentCallUserId
            );
        }
    );
}

// ===============================
// API REQUEST
// ===============================

async function apiRequest(url, options = {}) {

    const response = await fetch(
        `${API}${url}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",

                "Authorization":
                    `Bearer ${token}`,

                ...(options.headers || {})
            }
        }
    );

    const data = await response.json();

    if (response.status === 401) {
        logout();
        return null;
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Request failed"
        );
    }

    return data;
}


// ===============================
// USER INFO
// ===============================

if (currentUser && userInfo) {
    userInfo.innerText =
        `${currentUser.firstName} ${currentUser.lastName}`;
}

// ===============================
// PROFILE PANEL
// ===============================

function openProfilePanel() {

    if (!currentUser) {
        return;
    }

    const firstName =
        currentUser.firstName || "";

    const lastName =
        currentUser.lastName || "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    profileName.innerText =
        fullName || "User";

    profileEmail.innerText =
        currentUser.email || "No email";

    profilePhone.innerText =
        currentUser.phone || "No phone";

    const initials =
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    profileAvatarLarge.innerText =
        initials || "U";

    profilePanel.classList.remove("hidden");
}


function closeProfilePanel() {

    profilePanel.classList.add("hidden");
}


profileBtn.addEventListener(
    "click",
    openProfilePanel
);


closeProfileBtn.addEventListener(
    "click",
    closeProfilePanel
);

// ===============================
// SETTINGS PANEL
// ===============================

function openSettingsPanel() {

    settingsPanel.classList.remove("hidden");
}


function closeSettingsPanel() {

    settingsPanel.classList.add("hidden");
}


settingsBtn.addEventListener(
    "click",
    openSettingsPanel
);


closeSettingsBtn.addEventListener(
    "click",
    closeSettingsPanel
);

function openAccountPanel() {
    if (!currentUser) return;

    accountFirstName.value = currentUser.firstName || "";
    accountLastName.value = currentUser.lastName || "";
    accountEmail.value = currentUser.email || "";
    accountPhone.value = currentUser.phone || "";

    settingsPanel.classList.add("hidden");
    accountPanel.classList.remove("hidden");
}

accountSettingsBtn.addEventListener(
    "click",
    openAccountPanel
);

closeAccountBtn.addEventListener(
    "click",
    () => {
        accountPanel.classList.add("hidden");
        settingsPanel.classList.remove("hidden");
    }
);

async function saveAccountChanges() {
    
    try {
        const response = await fetch(
            `${API}/users/profile`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName: accountFirstName.value.trim(),
                    lastName: accountLastName.value.trim(),
                    email: accountEmail.value.trim(),
                    phone: accountPhone.value.trim()
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to update account");
            return;
        }

        localStorage.setItem(
            "user",
            JSON.stringify({
                id: data.user._id,
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                email: data.user.email,
                phone: data.user.phone
                
            })
        );

        currentUser.firstName = data.user.firstName;
currentUser.lastName = data.user.lastName;
currentUser.email = data.user.email;
currentUser.phone = data.user.phone;

if (userInfo) {
    userInfo.innerText =
        `${currentUser.firstName} ${currentUser.lastName}`;
}

if (profileName) {
    profileName.innerText =
        `${currentUser.firstName} ${currentUser.lastName}`;
}

if (profileEmail) {
    profileEmail.innerText =
        currentUser.email || "No email";
}

if (profilePhone) {
    profilePhone.innerText =
        currentUser.phone || "No phone";
}

        alert("Account updated successfully");

    } catch (error) {
        console.error(
            "Save account error:",
            error
        );

        alert("Server error");
    }
}

saveAccountBtn.addEventListener(
    "click",
    saveAccountChanges
);

async function changePassword() {
    try {
        const response = await fetch(
            `${API}/users/password`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword:
                        currentPassword.value,
                    newPassword:
                        newPassword.value,
                    confirmPassword:
                        confirmPassword.value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Failed to change password"
            );
            return;
        }

        currentPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";

        alert("Password changed successfully");

    } catch (error) {
        console.error(
            "Change password error:",
            error
        );

        alert("Server error");
    }
}

changePasswordBtn.addEventListener(
    "click",
    changePassword
);

// ===============================
// SOCKET.IO
// ===============================

function connectSocket() {

    socket = io(
        "http://localhost:3000",
        {
            auth: {
                token
            }
        }
    );


    socket.on("connect", () => {

        console.log(
            "Socket connected:",
            socket.id
        );


       if (currentConversationId) {

    console.log(
        "JOINING ROOM:",
        currentConversationId
    );

    socket.emit(
        "joinConversation",
        currentConversationId
    );
        }
    });


    socket.on(
        "connect_error",
        (error) => {

            console.error(
                "Socket connection error:",
                error.message
            );
        }
    );


    // ===============================
    // INCOMING CALL
    // ===============================

    socket.on(
        "incomingCall",
        async (data) => {

            console.log(
                "Incoming call:",
                data
            );

            if (
                !data ||
                !data.offer ||
                !data.callerId
            ) {
                console.error(
                    "Invalid incoming call data"
                );

                return;
            }

            currentCallType =
                data.callType || "audio";

            currentCallUserId =
                String(data.callerId);

            currentCallSocketId =
                String(data.callId);

            currentConversationId =
                data.conversationId || null;

            callContainer.classList.remove(
                "hidden"
            );

            callStatus.innerText =
                "Incoming call...";

            const accepted =
                confirm(
                    "Incoming " +
                    currentCallType +
                    " call. Accept?"
                );

            if (!accepted) {

                socket.emit(
                    "rejectCall",
                    {
                        callerSocketId:
                            data.callId
                    }
                );

                callContainer.classList.add(
                    "hidden"
                );

                return;
            }

            try {

                localStream =
                    await getAudioStream();

                if (!localStream) {
                    return;
                }

                peerConnection =
                    createPeerConnection();

                localStream
                    .getTracks()
                    .forEach(
                        (track) => {

                            peerConnection.addTrack(
                                track,
                                localStream
                            );

                        }
                    );

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        data.offer
                    )
                );

                const answer =
                    await peerConnection.createAnswer();

                await peerConnection.setLocalDescription(
                    answer
                );

                socket.emit(
                    "acceptCall",
                    {
                        callerSocketId:
                            data.callId,

                        answer
                    }
                );

                callStatus.innerText =
                    "Call connected";

            } catch (error) {

                console.error(
                    "Accept call error:",
                    error
                );

                callStatus.innerText =
                    "Call failed";

                socket.emit(
                    "rejectCall",
                    {
                        callerSocketId:
                            data.callId
                    }
                );
            }
        }
    );


    // ===============================
    // CALL ACCEPTED
    // ===============================

    socket.on(
        "callAccepted",
        async (data) => {

            console.log(
                "Call accepted:",
                data
            );

            if (data.targetSocketId) {
    currentCallSocketId =
        String(data.targetSocketId);

    console.log(
        "TARGET SOCKET ID:",
        currentCallSocketId
    );

    if (pendingIceCandidates.length > 0) {
        console.log(
            "Flushing queued ICE candidates:",
            pendingIceCandidates.length
        );

        pendingIceCandidates.forEach(candidate => {
            socket.emit("iceCandidate", {
                candidate,
                targetSocketId: currentCallSocketId
            });
        });

        pendingIceCandidates = [];
    }
}

            if (
                !data ||
                !data.answer ||
                !peerConnection
            ) {
                console.error(
                    "Invalid callAccepted data"
                );

                return;
            }

            try {

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        data.answer
                    )
                );

                callStatus.innerText =
                    "Call connected";

                console.log(
                    "Remote answer applied"
                );

            } catch (error) {

                console.error(
                    "Call accepted error:",
                    error
                );

                callStatus.innerText =
                    "Call failed";
            }
        }
    );


    // ===============================
    // CALL ERROR
    // ===============================

    socket.on(
        "callError",
        (data) => {
            console.error(
                "Call error:",
                data
            );

            callStatus.innerText =
                data?.message || "Call failed";

            cleanupCall();
        }
    );


    // ===============================
    // CALL ENDED
    // ===============================

    socket.on(
        "callEnded",
        () => {
            console.log("Call ended by remote user");
            cleanupCall();
        }
    );


    socket.on(
        "newMessage",
     (message) => {

            console.log(
                "New message:",
                message
            );


            if (!message) {
                return;
            }


            /*
             * Normalize conversation ID.
             *
             * Depending on the server response,
             * message.conversation can be:
             *
             * "conversationId"
             *
             * OR
             *
             * {
             *     _id: "conversationId"
             * }
             */

            const messageConversationId =
                String(
                    message.conversation?._id ||
                    message.conversation?.id ||
                    message.conversation
                );


            /*
             * If this message belongs to the
             * conversation currently open,
             * add it to the chat window.
             */

            if (
                messageConversationId ===
                String(currentConversationId)
            ) {

                addMessageToUI(
                    message
                );

                scrollMessages();
            }


            /*
             * Update sidebar immediately.
             */

            updateConversationFromMessage(
                message,
                messageConversationId
            );
        }
    );


    socket.on(
        "messageError",
        (error) => {

            console.error(
                "Socket message error:",
                error
            );

            alert(
                error.message ||
                "Message error"
            );
        }
    );    // ===============================
    // ICE CANDIDATE
    // ===============================

    socket.on(
        "iceCandidate",
        async (data) => {

            console.log(
                "Received ICE candidate:",
                data
            );

            if (
                !data ||
                !data.candidate ||
                !peerConnection
            ) {
                return;
            }

            try {

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        data.candidate
                    )
                );

                console.log(
                    "ICE candidate added"
                );

            } catch (error) {

                console.error(
                    "Add ICE candidate error:",
                    error
                );
            }
        }
    );
}



// ===============================
// UPDATE CONVERSATION FROM MESSAGE
// ===============================

function updateConversationFromMessage(message, conversationId) {
    const id = String(conversationId);

    const index = conversationsCache.findIndex(
        conversation => String(conversation._id) === id
    );

    if (index === -1) {
        loadConversations();
        return;
    }

    const conversation = conversationsCache[index];

    conversation.lastMessage = message;
    conversation.updatedAt =
        message.createdAt || new Date().toISOString();

    // Remove old position
    conversationsCache.splice(index, 1);

    // Put updated conversation at the top
    conversationsCache.unshift(conversation);

    // Render directly from cache
    renderConversationsFromCache();
}

function renderConversationsFromCache() {
    renderConversations({
        conversations: conversationsCache
    });
}

// ===============================
// USER SEARCH
// ===============================

if (userSearchInput) {

    userSearchInput.addEventListener(
        "input",
        async () => {

            const q =
                userSearchInput.value.trim();

            if (q.length < 2) {
                searchResults.innerHTML = "";
                return;
            }


            try {

                const users =
                    await apiRequest(
                        `/users/search?q=${q}`
                    );


                searchResults.innerHTML = "";


                users.forEach(
                    (user) => {

                        const div =
                            document.createElement("div");

                        div.className =
                            "search-user";


                        div.innerHTML = `
                            <span>
                                ${user.firstName}
                                ${user.lastName}
                            </span>

                            <button>
    ${
        myContacts.includes(String(user._id))
        ? "Chat"
        : "Add"
    }
</button>
                        `;


                       const button =
    div.querySelector("button");


button.addEventListener(
    "click",
    async () => {

        if (
            myContacts.includes(
                String(user._id)
            )
        ) {

            // Already contact -> open chat
            await openContact(
                user._id
            );

        } else {

            // New contact -> add first
            await addContact(
                user._id
            );

            await loadContacts();

            await openContact(
                user._id
            );

        }

    }
);


                        searchResults.appendChild(div);

                    }
                );


            } catch(error) {

                console.error(
                    "Search error:",
                    error
                );

            }

        }
    );

}





// ===============================
// ADD CONTACT
// ===============================

async function addContact(userId) {

    try {

        console.log(
            "ADDING CONTACT:",
            String(userId)
        );

        console.log(
            "CURRENT USER:",
            String(currentUser._id || currentUser.id)
        );

        const result =
            await apiRequest(
                "/contacts/add",
                {
                    method: "POST",

                    body: JSON.stringify({
                        contactId: String(userId)
                    })
                }
            );

        console.log(
            "CONTACT ADDED:",
            result
        );

        alert("Contact added");

        searchResults.innerHTML = "";

        userSearchInput.value = "";

        await loadContacts();

    } catch (error) {

        console.error(
            "ADD CONTACT ERROR:",
            error.message
        );

        alert(
            error.message ||
            "Could not add contact"
        );
    }
}



async function loadContacts() {

    try {

        console.log("Loading contacts...");

        const data =
            await apiRequest("/contacts");

        if (!data) {
            return;
        }

        console.log(
            "Contacts response:",
            data
        );

        /*
         * Backend returns an array directly:
         *
         * [
         *   {
         *     owner: "...",
         *     contact: {
         *       _id: "...",
         *       firstName: "...",
         *       lastName: "...",
         *       email: "...",
         *       phone: "..."
         *     }
         *   }
         * ]
         */

        const contacts =
            Array.isArray(data)
                ? data
                : data.contacts || [];

        myContacts =
            contacts
                .map((item) => {

                    const contact =
                        item.contact || item;

                    return String(
                        contact._id ||
                        contact.id
                    );

                })
                .filter(Boolean);

        console.log(
            "My contacts:",
            myContacts
        );

        if (!contactList) {
            console.warn(
                "contactsList element not found"
            );

            return;
        }

        contactList.innerHTML = "";

        if (contacts.length === 0) {

            contactList.innerHTML =
                "<p class='empty'>No contacts yet.</p>";

            return;
        }

        contacts.forEach((item) => {

            const contact =
                item.contact || item;

            if (!contact || !contact._id) {
                return;
            }

            const div =
                document.createElement("div");

            div.className = "contact";

            div.innerHTML = `
                <div class="conversation-avatar">
                    ${escapeHtml(
                        (
                            (contact.firstName || "")[0] ||
                            ""
                        ) +
                        (
                            (contact.lastName || "")[0] ||
                            ""
                        )
                    )}
                </div>

                <div class="contact-info">
                    <div class="contact-name">
                        ${escapeHtml(
                            `${contact.firstName || ""} ${contact.lastName || ""}`
                        )}
                    </div>

                    <div class="contact-phone">
                        ${escapeHtml(
                            contact.phone || contact.email || ""
                        )}
                    </div>
                </div>
            `;

            div.addEventListener(
                "click",
                () => {
                    openContact(contact._id);
                }
            );

            contactList.appendChild(div);
        });

    } catch (error) {

        console.error(
            "Load contacts error:",
            error
        );

        if (contactList) {

            contactList.innerHTML =
                "<p class='empty'>Failed to load contacts.</p>";
        }
    }
}

// ===============================
// LOAD CONVERSATIONS
// ===============================

async function loadConversations() {
    try {
        const data = await apiRequest("/conversations");

        if (!data) {
            return;
        }

        console.log("Conversations:", data);

        console.log(
            "RAW JSON:",
            JSON.stringify(data, null, 2)
        );

        // Store conversations in cache
        conversationsCache = [
            ...(data.conversations || [])
        ];

        // Render conversations
        renderConversations({
            conversations: conversationsCache
        });

    } catch (error) {
        console.error(
            "Load conversations error:",
            error
        );

        if (conversationList) {
            conversationList.innerHTML =
                "<p>Failed to load conversations.</p>";
        }
    }
}

// ===============================
// RENDER CONVERSATIONS
// ===============================

function renderConversations(data) {
    console.log("Conversations:", data);

    const conversations = data?.conversations || [];

    conversationList.innerHTML = "";

    if (conversations.length === 0) {
        conversationList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <strong>No chats yet</strong>
                <span>Start a new conversation</span>
            </div>
        `;
        return;
    }

    conversations.forEach((conversation) => {
        const otherUser = getOtherParticipant(conversation);

        if (!otherUser) return;

        const div = document.createElement("div");

        div.className = "conversation";

        if (
            String(conversation._id) ===
            String(currentConversationId)
        ) {
            div.classList.add("active");
        }

               const firstName = otherUser.firstName || "";
        const lastName = otherUser.lastName || "";

        const initials =
            ((firstName[0] || "") +
            (lastName[0] || "")).toUpperCase();

        const fullName =
            `${firstName} ${lastName}`.trim();

        const lastMessage = conversation.lastMessage;

        const preview = lastMessage
            ? lastMessage.text || ""
            : "No messages yet";

        const time = lastMessage?.createdAt
            ? formatConversationTime(lastMessage.createdAt)
            : "";

        div.innerHTML = `
            <div class="conversation-avatar">
                ${escapeHtml(initials)}
            </div>

            <div class="conversation-content">

                <div class="conversation-top">

                    <div class="conversation-name">
                        ${escapeHtml(fullName)}
                    </div>

                    <div class="conversation-time">
                        ${escapeHtml(time)}
                    </div>

                </div>

                <div class="conversation-bottom">

                    <div class="conversation-preview">
                        ${escapeHtml(preview)}
                    </div>

                </div>

            </div>

            <button
                class="conversation-menu"
                title="Chat options"
                type="button">
                ⋮
            </button>
        `;

        // Open conversation
        div.addEventListener("click", (event) => {

            if (
                event.target.closest(
                    ".conversation-menu"
                )
            ) {
                return;
            }

            openConversation(
                conversation
            );
        });

        // ===============================
        // CHAT OPTIONS MENU
       // ===============================

const menuButton =
    div.querySelector(".conversation-menu");

menuButton.addEventListener("click", (event) => {

    event.stopPropagation();

    // Remove an existing menu
    document
        .querySelectorAll(".chat-options-menu")
        .forEach(menu => menu.remove());

    const menu = document.createElement("div");

    menu.className = "chat-options-menu";

    menu.innerHTML = `
        <button
            type="button"
            class="delete-chat-option">
            🗑️ Delete chat
        </button>
    `;

    document.body.appendChild(menu);

    // Position menu near the button
    const rect =
        menuButton.getBoundingClientRect();

    menu.style.top =
        `${rect.bottom + 4}px`;

    menu.style.left =
        `${rect.right - 150}px`;

    const deleteButton =
        menu.querySelector(
            ".delete-chat-option"
        );

    deleteButton.addEventListener(
        "click",
        async () => {

            menu.remove();

            const confirmed =
                confirm(
                    `Delete chat with ${fullName}?`
                );

            if (!confirmed) {
                return;
            }

            await deleteConversation(
                conversation._id
            );
        }
    );
});

        conversationList.appendChild(div);
    });
}

// ===============================
// DELETE CONVERSATION
// ===============================

async function deleteConversation(conversationId) {

    try {

        const response = await fetch(
            `${API}/conversations/${conversationId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization:
                        `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Failed to delete chat"
            );

            return;
        }

        // Remove from local cache
        conversationsCache =
            conversationsCache.filter(
                conversation =>
                    String(conversation._id) !==
                    String(conversationId)
            );

        // If deleted chat was open
        if (
            String(currentConversationId) ===
            String(conversationId)
        ) {

            currentConversationId = null;

            chatTitle.innerText =
                "Select a conversation";

            messagesContainer.innerHTML = `
                <p>
                    Select a conversation to start chatting.
                </p>
            `;
        }

        // Refresh sidebar
        renderConversations({
            conversations:
                conversationsCache
        });

        console.log(
            "Conversation deleted:",
            conversationId
        );

    } catch (error) {

        console.error(
            "Delete conversation error:",
            error
        );

        alert(
            "Cannot connect to server"
        );
    }
}
// ===============================
// FORMAT CONVERSATION TIME
// ===============================

function formatConversationTime(
    dateString
) {

    const date =
        new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now =
        new Date();

    const sameDay =
        date.toDateString() ===
        now.toDateString();

    if (sameDay) {

        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    const yesterday =
        new Date(now);

    yesterday.setDate(
        now.getDate() - 1
    );

    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {
        return "Yesterday";
    }

    return date.toLocaleDateString(
        [],
        {
            day: "2-digit",
            month: "2-digit"
        }
    );
}


// ===============================
// FIND OTHER PARTICIPANT
// ===============================

// ===============================

function getOtherParticipant(conversation) {

    if (
        !conversation.participants ||
        !Array.isArray(conversation.participants)
    ) {
        return null;
    }

    return conversation.participants.find(
        (participant) => {

            const id = String(
                participant._id ||
                participant.id
            );

            return id !==
                String(currentUser._id || currentUser.id);
        }
    );
}


// ===============================
// OPEN CONVERSATION
// ===============================

async function openConversation(
    conversation
) {

    const conversationId =
        String(conversation._id);

    console.log(
        "Opening conversation:",
        conversationId
    );

    if (
        socket &&
        currentConversationId
    ) {
        socket.emit(
            "leaveConversation",
            currentConversationId
        );
    }

    currentConversationId =
        conversationId;

    const otherUser =
    getOtherParticipant(
        conversation
    );

if (otherUser) {

    chatTitle.innerText =
        `${otherUser.firstName} ${otherUser.lastName}`;

    currentCallUserId =
        String(
            otherUser._id ||
            otherUser.id
        );

    console.log(
        "CALL TARGET USER:",
        currentCallUserId
    );

} else {

    chatTitle.innerText =
        "Conversation";

    currentCallUserId = null;
}

    messagesContainer.innerHTML =
        "<p>Loading messages...</p>";

    if (socket && socket.connected) {

        socket.emit(
            "joinConversation",
            conversationId
        );
    }

    await loadMessages(
        conversationId
    );
}

// ===============================
// OPEN CONTACT
// CREATE OR GET CONVERSATION
// ===============================

async function openContact(userId) {

    try {

        console.log(
            "Creating/opening conversation with:",
            userId
        );

        const result =
            await apiRequest(
                "/conversations",
                {
                    method: "POST",

                    body: JSON.stringify({
                        userId: userId
                    })
                }
            );

        if (!result || !result.conversation) {

            throw new Error(
                "Conversation was not returned by server"
            );
        }

        console.log(
            "Conversation:",
            result.conversation
        );

        await loadConversations();

        await openConversation(
            result.conversation
        );

    } catch (error) {

        console.error(
            "Open contact error:",
            error
        );

        alert(
            error.message ||
            "Could not open conversation"
        );
    }
}


// ===============================
// LOAD MESSAGES
// ===============================

async function loadMessages(
    conversationId
) {

    try {

        console.log(
            "Loading messages for:",
            conversationId
        );

        const data =
            await apiRequest(
                `/messages/${conversationId}`
            );

        if (!data) return;

        console.log(
    "Messages response:",
    JSON.stringify(data, null, 2)
);
        messagesContainer.innerHTML = "";

        const messages =
            data.messages || [];

        if (messages.length === 0) {

            messagesContainer.innerHTML =
                "<p>No messages yet.</p>";

            return;
        }

        messages.forEach(
            (message) => {

                addMessageToUI(
                    message
                );
            }
        );

        scrollMessages();

    } catch (error) {

        console.error(
            "Load messages error:",
            error
        );

        messagesContainer.innerHTML =
            "<p>Failed to load messages.</p>";
    }
}


// ===============================
// ADD MESSAGE TO UI
// ===============================

function addMessageToUI(message) {

    console.log(
        "ADDING MESSAGE TO UI:",
        message.text
    );

    if (!message || !message._id) {
        return;
    }

    // Prevent duplicates
    const existing =
        document.querySelector(
            `[data-message-id="${message._id}"]`
        );

    if (existing) {
        return;
    }

    const div =
        document.createElement("div");

    div.className = "message";

    div.dataset.messageId =
        message._id;

    const sender =
        message.sender;

    const senderId =
        String(
            sender?._id ||
            sender?.id ||
            message.sender
        );

   if (
 senderId ===
 String(
    currentUser._id || currentUser.id
 )
    ) {
        div.classList.add("mine");
    }

    const senderName =
        sender
            ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim()
            : "User";

    div.innerHTML = `
       

        <div>
            ${escapeHtml(message.text || "")}
        </div>
    `;

    // THIS IS IMPORTANT
    messagesContainer.appendChild(div);

    scrollMessages();
}


// ===============================
// SEND MESSAGE
// ===============================

messageForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        const text =
            messageInput.value.trim();

        if (!currentConversationId) {

            alert(
                "Select a conversation first."
            );

            return;
        }

        if (!text) {
            return;
        }

        if (
            !socket ||
            !socket.connected
        ) {

            alert(
                "Socket is not connected."
            );

            return;
        }

        socket.emit(
            "sendMessage",
            {
                conversationId:
                    currentConversationId,

                text
            }
        );

        messageInput.value = "";
        messageInput.focus();
    }
);


// ===============================
// LOGOUT
// ===============================

function logout() {

    if (socket) {
        socket.disconnect();
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href =
        "login.html";
}


logoutBtn.addEventListener(
    "click",
    logout
);



// ===============================
// HTML ESCAPE
// ===============================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        String(text);

    return div.innerHTML;
}


// ===============================
// SCROLL
// ===============================

function scrollMessages() {

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


// ===============================
// OPEN SELLER FROM PRODUCT PAGE
// ===============================

async function openSellerFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const sellerId =
        params.get("seller");

    if (!sellerId) {
        return;
    }

    if (
        String(sellerId) ===
        String(
            currentUser._id ||
            currentUser.id
        )
    ) {
        alert(
            "You cannot chat with yourself."
        );

        return;
    }

    try {

        await openContact(sellerId);

        const url =
            new URL(
                window.location.href
            );

        url.searchParams.delete(
            "seller"
        );

        window.history.replaceState(
            {},
            "",
            url.pathname
        );

    } catch (error) {

        console.error(
            "Open seller from URL error:",
            error
        );

        alert(
            error.message ||
            "Could not open seller conversation."
        );
    }
}


// ===============================
// START
// ===============================

connectSocket();

loadContacts();

loadConversations().then(() => {
    openSellerFromUrl();
});


