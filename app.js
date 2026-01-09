const tg = window.Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe.user;

document.getElementById("user").innerText =
  user ? `Привет, ${user.first_name}` : "Привет, игрок";

document.getElementById("play").onclick = () => {
  tg.showAlert("Игра началась!");
};