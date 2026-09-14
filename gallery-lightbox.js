// grab the photos and the popup stuff from the page
const images = document.querySelectorAll(".photo_container .image");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox_image");
const closeButton = document.getElementById("lightbox_close");

// The grid <img> is responsive, so press-and-hold there saves whichever small
// srcset candidate the phone happened to pick. The popup deliberately loads
// data-full -- the biggest file we generated, with no srcset -- so there is
// only one resource to save and press-and-hold gets the full-size photo.
function fullSizeOf(image) {
  return image.getAttribute("data-full") || image.src;
}

// this closes the popup
function closeLightbox() {
  lightbox.classList.remove("is_open");
  lightboxImage.src = "";
  lightboxImage.alt = "";
  document.body.classList.remove("lightbox_open");
}

// let each photo open the popup
for (let i = 0; i < images.length; i++) {
  images[i].addEventListener("click", function () {
    lightboxImage.src = fullSizeOf(images[i]);
    lightboxImage.alt = images[i].alt;
    lightbox.classList.add("is_open");
    document.body.classList.add("lightbox_open");
  });
}

// click the x to close it
closeButton.addEventListener("click", closeLightbox);

// click the dark background to close it
lightbox.addEventListener("click", function (event) {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

// escape closes it too
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeLightbox();
  }
});
