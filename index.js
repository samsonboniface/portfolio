const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();

        const targetPage = link.dataset.page;
        const page = document.getElementById(targetPage);

        if (!page) {
            return;
        }

        navLinks.forEach((navLink) => navLink.classList.remove("active"));
        pages.forEach((section) => section.classList.remove("active"));

        link.classList.add("active");
        page.classList.add("active");
    });
});
