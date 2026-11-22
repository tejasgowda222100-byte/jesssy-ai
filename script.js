const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('chatForm');
const input = document.getElementById('chatInput');
const messages = document.getElementById('chatMessages');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  const userMessage = document.createElement('div');
  userMessage.className = 'message user';
  userMessage.textContent = question;
  messages.appendChild(userMessage);
  const reply = document.createElement('div');
  reply.className = 'message assistant';
  reply.textContent = 'Thanks for trying JESSY AI! This public website is currently in preview mode. The live AI service will be connected after the JESSY AI backend is securely deployed.';
  messages.appendChild(reply);
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
});
