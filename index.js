const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("main > .page");

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }

        navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
    });
}, {
    rootMargin: "-35% 0px -55% 0px",
});

sections.forEach((section) => sectionObserver.observe(section));

const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");

contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = contactForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    formStatus.textContent = "Sending your message...";
    formStatus.classList.remove("error");

    try {
        const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to send your message.");
        }

        formStatus.textContent = result.message;
        contactForm.reset();
    } catch (error) {
        formStatus.textContent = error.message;
        formStatus.classList.add("error");
    } finally {
        submitButton.disabled = false;
    }
});
