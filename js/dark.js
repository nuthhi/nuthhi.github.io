// Get the toggle switch and the body element
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme preference in localStorage
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.checked = true;  // Keep the switch checked in dark mode
}

// Toggle dark mode
themeToggle.addEventListener('change', () => {
    body.classList.toggle('dark-mode');
    
    // Save the user's preference in localStorage
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.removeItem('theme');
    }
});
