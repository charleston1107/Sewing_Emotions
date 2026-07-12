const resultFrame = document.querySelector(".result-frame");
const imageUrl = localStorage.getItem("sewing-emotions-generated-image");

if (imageUrl) {
  const image = document.createElement("img");
  image.className = "step4-generated-image";
  image.src = imageUrl;
  image.alt = "Generated emotion character";
  resultFrame.appendChild(image);
} else {
  const message = document.createElement("p");
  message.className = "step4-empty-message";
  message.textContent = "No generated image yet.";
  resultFrame.appendChild(message);
}
