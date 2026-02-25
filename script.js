// ===========================================
// 1. DAFTAR PENGGUNA (Multi User)
// ===========================================
// Sesuaikan username (email/hp) dan password sesuai kebutuhan Anda
const users = [
  {
    username: "smaduwangi",
    password: "smadupass",
    redirectTo: "https://cashupsemaduwangi.github.io/HppyCalc/",
  },
  // Tambahkan user lain di sini
];

// ===========================================
// 2. FUNGSI LOGIKA LOGIN
// ===========================================

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const emailPhoneInput = document.getElementById("emailPhone");
  const passwordInput = document.getElementById("password");
  const errorMessageDiv = document.getElementById("errorMessage");

  // Mencegah pengiriman form default
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Menghentikan reload halaman

    const inputUsername = emailPhoneInput.value.trim();
    const inputPassword = passwordInput.value.trim();

    // Mencari pengguna yang cocok
    const userFound = users.find(
      (user) =>
        user.username === inputUsername && user.password === inputPassword,
    );

    // Validasi Hasil
    if (userFound) {
      // Login Berhasil!
      errorMessageDiv.classList.add("hidden");

      // Mengalihkan pengguna ke halaman yang ditentukan oleh userFound.redirectTo
      // Saat ini, semua diarahkan ke index.html
      window.location.href = userFound.redirectTo;
    } else {
      // Login Gagal!

      // Tampilkan pesan error
      errorMessageDiv.classList.remove("hidden");

      // Kosongkan input password
      passwordInput.value = "";

      // Fokuskan kembali ke input username/email
      emailPhoneInput.focus();
    }
  });
});

// ===========================================
// 3. KONFIGURASI TOMBOL KEMBALI
// ===========================================

const urlTujuan = "index.html"; // Ganti dengan URL kustom Anda

document.getElementById("year").textContent = new Date().getFullYear();

// --- LOGIK TRANSISI KELUAR ---
const btnKembali = document.getElementById("btnKembali");
const mainCard = document.getElementById("mainCard");

btnKembali.addEventListener("click", function () {
  // Tambahkan class animasi keluar
  mainCard.classList.add("page-exit");

  // Tunggu animasi CSS selesai (500ms sesuai durasi transition) baru pindah halaman
  setTimeout(() => {
    window.location.href = urlTujuan;
  }, 500);
});

// --- SHOW/HIDE PASSWORD ---
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
}


