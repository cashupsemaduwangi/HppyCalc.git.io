// ===========================================
// 1. DAFTAR PENGGUNA (Multi User)
// ===========================================
// Sesuaikan username (email/hp) dan password sesuai kebutuhan Anda
const users = [
  {
    username: "jingga",
    password: "Ji12345",
    redirectTo: "https://jaxzyv.github.io/HppyClac/", // Halaman yang akan dituju
  },
  {
    username: "user123",
    password: "userpass",
    redirectTo: "https://jaxzyv.github.io/HppyClac/",
  },
  {
    username: "smaduwangi", // Contoh login dengan nomor handphone
    password: "smadupass",
    redirectTo: "https://jaxzyv.github.io/HppyClac/",
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
