function uploadImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an image first!');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            const responseText = document.getElementById('responseText');
            if (data.success) {
                responseText.innerHTML = `Detected objects: ${data.objects.join(', ')}`;
            } else {
                responseText.innerHTML = 'Error processing the image.';
            }
        })
        .catch(err => {
            console.error(err);
            alert('Something went wrong.');
        });
}
