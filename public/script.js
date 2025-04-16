// ✅ script.js (frontend interaction logic with conversation)
let conversationStep = 0;

async function uploadImage() {
    const fileInput = document.getElementById("imageUpload");
    const responseText = document.getElementById("responseText");

    if (!fileInput.files.length) {
        responseText.innerText = "Please select an image first.";
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const res = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (data.success) {
        document.getElementById("results").innerHTML = `
            <h2>📸 Detection Results</h2>
            <img src="${data.processed_image}" style="max-width:100%; border-radius: 15px;" />
            <p>I detected these objects: ${data.objects.join(", ")}.</p>
            <p>You can ask about the objects like:</p>
            <ul style="text-align:left">
                <li>What objects are detected?</li>
                <li>How many cars are there?</li>
                <li>What is the color of dog?</li>
                <li>Is there a person?</li>
            </ul>
            <input type="text" id="questionInput" placeholder="Ask me about the image..." style="width: 100%; padding: 10px; margin-top: 10px; border-radius: 10px; border: 1px solid #ccc;"/>
            <button onclick="askQuestion()">Ask</button>
            <div id="chatAnswer"></div>
        `;
        conversationStep = 1;
    } else {
        responseText.innerText = data.message || "Something went wrong.";
    }
}

async function askQuestion() {
    const question = document.getElementById("questionInput").value;
    if (!question) return;

    const res = await fetch("http://localhost:3001/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
    });

    const data = await res.json();
    const chatAnswer = document.getElementById("chatAnswer");

    chatAnswer.innerHTML = `<p><strong>Answer:</strong> ${data.answer}</p>`;

    // Prompt for next question
    setTimeout(() => {
        chatAnswer.innerHTML += `
            <p>Do you have another question? <button onclick="continueConversation(true)">Yes</button> <button onclick="continueConversation(false)">No</button></p>
        `;
    }, 500);
}

function continueConversation(hasQuestion) {
    const chatAnswer = document.getElementById("chatAnswer");
    if (hasQuestion) {
        chatAnswer.innerHTML = `
            <input type="text" id="questionInput" placeholder="Ask another question..." style="width: 100%; padding: 10px; margin-top: 10px; border-radius: 10px; border: 1px solid #ccc;"/>
            <button onclick="askQuestion()">Ask</button>
            <div id="chatAnswer"></div>
        `;
    } else {
        chatAnswer.innerHTML = `<p>Thanks for the conversation! 😊</p>`;
    }
}

// ✅ Theme toggle
function toggleTheme() {
    document.body.classList.toggle("dark");
}
