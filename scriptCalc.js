// Global state untuk menyimpan data produk yang sedang dihitung dan riwayat.
let currentCalculation = null;
let biayaChart = null;
const COUNTER_DURATION = 800; // Durasi animasi counter dalam ms

// =========================================================================
// Bagian 1: DOM Manipulation & Navigasi
// =========================================================================

/**
 * Mengganti section yang ditampilkan
 * @param {string} sectionId ID dari section yang ingin ditampilkan (e.g., 'kalkulator', 'riwayat')
 */
function showSection(sectionId) {
  document.querySelectorAll("section").forEach((section) => {
    section.classList.add("hidden-section");
    section.classList.remove("active-section");
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove("hidden-section");
    targetSection.classList.add("active-section");

    // Khusus untuk Riwayat, muat ulang datanya
    if (sectionId === "riwayat") {
      loadRiwayat();
    }
  }
}

/**
 * Menambah baris input dinamis untuk Bahan Baku atau Biaya Lain-lain
 * @param {string} containerId 'bahanBaku' atau 'biayaLainLain'
 * @param {string} prefix 'BB' atau 'BOP'
 * @param {number} value Nilai awal untuk biaya (opsional, untuk edit/dummy data)
 * @param {string} name Nama item (opsional, untuk edit/dummy data)
 */
function addItemRow(containerId, prefix, value = "", name = "") {
  const container = document.getElementById(containerId + "Container");
  const itemId = prefix + Date.now();

  const row = document.createElement("div");
  row.classList.add("dynamic-input-row");
  row.setAttribute("data-id", itemId);

  row.innerHTML = `
        <input type="text" class="input-name ${containerId}Name" placeholder="Nama ${prefix} (cth: Tepung)" value="${name}" required>
        <input type="number" class="input-cost ${containerId}Cost" placeholder="Biaya (Rp)" min="0" value="${value}" required>
        <button type="button" class="btn-remove" onclick="removeItemRow(this, '${containerId}')">Hapus</button>
        <div class="error-message hidden"></div>
    `;
  container.appendChild(row);

  // Tambahkan event listener untuk menghitung total saat input berubah
  row
    .querySelector(".input-cost")
    .addEventListener("input", () => updateTotalSummary(containerId));

  // Auto-focus ke input nama yang baru
  row.querySelector(".input-name").focus();

  // Update total segera setelah penambahan
  updateTotalSummary(containerId);
}

/**
 * Menghapus baris input dinamis
 * @param {HTMLButtonElement} button Element tombol 'Hapus'
 * @param {string} containerId 'bahanBaku' atau 'biayaLainLain'
 */
function removeItemRow(button, containerId) {
  const row = button.closest(".dynamic-input-row");
  if (row) {
    row.remove();
    updateTotalSummary(containerId);
  }
}

/**
 * Mengubah visibilitas instruksi (UX)
 * @param {HTMLElement} header Elemen header yang diklik
 */
function toggleInstruksi(header) {
  header.closest(".instruksi-card").classList.toggle("expanded");
}

/**
 * Mengisi form dengan data dummy saat pertama load (UX)
 */
function fillDummyData() {
  document.getElementById("productName").value = "";
  document.getElementById("jumlahUnit").value = "";
  document.getElementById("biayaTenagaKerja").value = "";

  // Clear existing dynamic inputs
  document.getElementById("bahanBakuContainer").innerHTML = "";
  document.getElementById("biayaLainLainContainer").innerHTML = "";

  // Dummy Bahan Baku
  addItemRow("bahanBaku", "BB", "", "");
  addItemRow("bahanBaku", "BB", "", "");

  // Dummy Biaya Lain-lain / Overhead
  addItemRow("biayaLainLain", "BOP", "", "");
  addItemRow("biayaLainLain", "BOP", "", "");

  // Update total untuk data dummy
  updateTotalSummary("bahanBaku");
  updateTotalSummary("biayaLainLain");
}

// Panggil saat DOM selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Tampilkan Kalkulator saat load
  showSection("kalkulator");
  // Isi dengan data dummy
  fillDummyData();
  // Tambahkan event listener untuk input Tenaga Kerja
  document.getElementById("biayaTenagaKerja").addEventListener("input", () => {
    const value =
      parseFloat(document.getElementById("biayaTenagaKerja").value) || 0;
    document.getElementById("totalTenagaKerjaDisplay").textContent =
      formatRupiah(value);
  });
  // Panggil sekali untuk memastikan display awal benar
  document.getElementById("biayaTenagaKerja").dispatchEvent(new Event("input"));
});

// =========================================================================
// Bagian 2: Validasi & Perhitungan Akuntansi (HPP)
// =========================================================================

/**
 * Fungsi utilitas untuk memformat angka menjadi format Rupiah
 * @param {number} number Angka yang akan diformat
 * @returns {string} String format Rupiah
 */
function formatRupiah(number) {
  if (isNaN(number) || number === null || number === undefined) return "Rp 0";
  return "Rp " + Math.round(number).toLocaleString("id-ID");
}

/**
 * Menampilkan pesan error di bawah input
 * @param {HTMLElement} input Element input
 * @param {string} message Pesan error
 */
function displayError(input, message) {
  input.classList.add("error");
  const row = input.closest(".dynamic-input-row");
  if (row) {
    const errorMessage = row.querySelector(".error-message");
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.classList.remove("hidden");
    }
  } else {
    // Untuk input non-dinamis
    let errorEl = input.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains("error-message")) {
      errorEl = document.createElement("div");
      errorEl.classList.add("error-message");
      input.parentNode.insertBefore(errorEl, input.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

/**
 * Menghapus pesan error di bawah input
 * @param {HTMLElement} input Element input
 */
function clearError(input) {
  input.classList.remove("error");
  const row = input.closest(".dynamic-input-row");
  if (row) {
    const errorMessage = row.querySelector(".error-message");
    if (errorMessage) {
      errorMessage.classList.add("hidden");
    }
  } else {
    const errorEl = input.nextElementSibling;
    if (errorEl && errorEl.classList.contains("error-message")) {
      errorEl.classList.add("hidden");
    }
  }
}

/**
 * Melakukan validasi pada semua input form
 * @returns {boolean} True jika semua valid, False jika ada error
 */
function validateForm() {
  let isValid = true;
  const inputs = document.querySelectorAll("#hpp-form input[required]");

  inputs.forEach((input) => {
    clearError(input);

    if (!input.value.trim()) {
      displayError(input, "Wajib diisi.");
      isValid = false;
    } else if (input.type === "number") {
      const value = parseFloat(input.value);
      if (isNaN(value)) {
        displayError(input, "Harus berupa angka.");
        isValid = false;
      } else if (value < 0) {
        displayError(input, "Tidak boleh negatif.");
        isValid = false;
      } else if (input.id === "jumlahUnit" && value < 1) {
        displayError(input, "Minimal 1 unit.");
        isValid = false;
      }
    }

    // Validasi khusus untuk nama item dinamis
    if (input.classList.contains("input-name") && !input.value.trim()) {
      displayError(input, "Nama item wajib diisi.");
      isValid = false;
    }
  });

  return isValid;
}

/**
 * Menghitung total biaya untuk input dinamis dan mengupdate display ringkasan
 * @param {string} containerId 'bahanBaku' atau 'biayaLainLain'
 */
function updateTotalSummary(containerId) {
  const costInputs = document.querySelectorAll(
    `#${containerId}Container .input-cost`,
  );
  let total = 0;

  costInputs.forEach((input) => {
    const value = parseFloat(input.value) || 0;
    total += value;
  });

  const displayId =
    containerId === "bahanBaku"
      ? "totalBahanBakuDisplay"
      : "totalLainLainDisplay";
  document.getElementById(displayId).textContent = formatRupiah(total);
}

/**
 * Mengambil data input dari form
 * @returns {object|null} Objek data input atau null jika validasi gagal
 */
function getFormData() {
  if (!validateForm()) {
    return null;
  }

  // Fungsi helper untuk mengambil item dinamis
  const getDynamicItems = (containerId) => {
    const items = [];
    const rows = document.querySelectorAll(
      `#${containerId}Container .dynamic-input-row`,
    );
    rows.forEach((row) => {
      const name = row.querySelector(".input-name").value.trim();
      const cost = parseFloat(row.querySelector(".input-cost").value);
      items.push({ name, cost });
    });
    return items;
  };

  const totalBahanBaku = getDynamicItems("bahanBaku").reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const totalBiayaLainLain = getDynamicItems("biayaLainLain").reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const totalTenagaKerja = parseFloat(
    document.getElementById("biayaTenagaKerja").value,
  );

  return {
    namaProduk: document.getElementById("productName").value.trim(),
    jumlahUnit: parseInt(document.getElementById("jumlahUnit").value),
    biayaBahanBakuDetail: getDynamicItems("bahanBaku"),
    totalBahanBaku: totalBahanBaku,
    totalTenagaKerja: totalTenagaKerja,
    biayaLainLainDetail: getDynamicItems("biayaLainLain"),
    totalBiayaLainLain: totalBiayaLainLain,
    tanggalPerhitungan: new Date().toISOString(),
    marginLabaPersen:
      parseFloat(document.getElementById("marginLaba").value) || 0,
  };
}

/**
 * Menghitung HPP berdasarkan data input (Standar Akuntansi)
 * @param {object} data Data input dari form
 * @returns {object} Hasil perhitungan
 */
function hitungHPP(data) {
  const { totalBahanBaku, totalTenagaKerja, totalBiayaLainLain, jumlahUnit } =
    data;

  // Total Biaya Produksi = BB + BTKL + BOP
  const totalBiayaProduksi =
    totalBahanBaku + totalTenagaKerja + totalBiayaLainLain;

  // HPP per Unit = Total Biaya Produksi / Jumlah Unit
  const hppPerUnit = totalBiayaProduksi / jumlahUnit;

  return {
    ...data,
    totalBiayaProduksi: totalBiayaProduksi,
    hppPerUnit: hppPerUnit,
  };
}

/**
 * Event Listener Submit Form
 */
document.getElementById("hpp-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = getFormData();
  if (!formData) {
    // Biarkan validasi error yang tampil
    document.getElementById("hasil-perhitungan").classList.add("hidden");
    return;
  }

  const hasil = hitungHPP(formData);
  currentCalculation = hasil; // Simpan hasil di state global
  displayResults(hasil);
  // Hapus harga jual lama
  document.querySelector(".harga-jual-output").classList.add("hidden");
});

/**
 * Menghitung dan menampilkan Harga Jual Saran
 */
function hitungHargaJual() {
  if (!currentCalculation) {
    alert("Mohon hitung HPP terlebih dahulu!");
    return;
  }

  const marginInput = document.getElementById("marginLaba");
  clearError(marginInput);

  const marginLabaPersen = parseFloat(marginInput.value) || 0;

  if (
    isNaN(marginLabaPersen) ||
    marginLabaPersen < 0 ||
    marginLabaPersen > 1000
  ) {
    displayError(marginInput, "Margin harus angka 0-1000."); // Batas margin sedikit lebih tinggi untuk fleksibilitas
    return;
  }

  // Perhitungan: HPP per Unit / (1 - Margin Persen / 100)
  // Margin laba dihitung dari harga jual (Mark-up margin)
  // Harga Jual = HPP / (1 - Margin%)
  let hargaJualSaran = 0;
  if (marginLabaPersen >= 100) {
    // Jika margin 100% atau lebih dari Harga Jual, ini tidak mungkin,
    // asumsikan margin 100% dari HPP (mark-up cost)
    hargaJualSaran =
      currentCalculation.hppPerUnit * (1 + marginLabaPersen / 100);
  } else {
    // Margin umum, dihitung dari Harga Jual
    hargaJualSaran =
      currentCalculation.hppPerUnit / (1 - marginLabaPersen / 100);
  }

  // Update state global
  currentCalculation.marginLabaPersen = marginLabaPersen;
  currentCalculation.hargaJualSaran = hargaJualSaran;

  // Tampilkan hasilnya
  const outputEl = document.querySelector(".harga-jual-output");
  outputEl.classList.remove("hidden");
  document.getElementById("marginPersenOutput").textContent = marginLabaPersen;
  animateCounter("outputHargaJual", hargaJualSaran);
}

// =========================================================================
// Bagian 3: Display Hasil & Animasi
// =========================================================================

/**
 * Menampilkan hasil perhitungan di card
 * @param {object} hasil Hasil perhitungan HPP
 */
function displayResults(hasil) {
  document.getElementById("hasil-perhitungan").classList.remove("hidden");

  // 1. Tampilkan Angka Ringkasan dengan Animasi Counter
  animateCounter("outputTotalBiaya", hasil.totalBiayaProduksi);
  animateCounter("outputHPPUnit", hasil.hppPerUnit);

  // 2. Tampilkan Tabel Ringkasan Biaya
  updateRingkasanTable(hasil);

  // 3. Gambar Grafik Komposisi
  drawBiayaChart(hasil);
}

/**
 * Fungsi animasi counter
 * @param {string} elementId ID element span yang akan diupdate
 * @param {number} finalValue Nilai akhir
 */
function animateCounter(elementId, finalValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let startValue = 0;
  const isRupiah = elementId.includes("output"); // Asumsi semua output adalah Rupiah

  const startTime = performance.now();

  function updateCounter(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / COUNTER_DURATION, 1);
    const currentValue = progress * finalValue;

    el.textContent = isRupiah
      ? formatRupiah(currentValue)
      : Math.round(currentValue).toLocaleString("id-ID", {
          maximumFractionDigits: 2,
        }) + (elementId.includes("Persen") ? "%" : "");

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      // Pastikan nilai akhir yang diformat tampil sempurna
      el.textContent = isRupiah
        ? formatRupiah(finalValue)
        : finalValue.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    }
  }

  requestAnimationFrame(updateCounter);
}

/**
 * Mengupdate tabel ringkasan komposisi biaya
 * @param {object} hasil Hasil perhitungan HPP
 */
function updateRingkasanTable(hasil) {
  const {
    totalBahanBaku,
    totalTenagaKerja,
    totalBiayaLainLain,
    totalBiayaProduksi,
  } = hasil;

  const persenBB = (totalBahanBaku / totalBiayaProduksi) * 100 || 0;
  const persenBTKL = (totalTenagaKerja / totalBiayaProduksi) * 100 || 0;
  const persenBOP = (totalBiayaLainLain / totalBiayaProduksi) * 100 || 0;

  document.getElementById("ringkasanBB").textContent =
    formatRupiah(totalBahanBaku);
  document.getElementById("ringkasanBTKL").textContent =
    formatRupiah(totalTenagaKerja);
  document.getElementById("ringkasanBOP").textContent =
    formatRupiah(totalBiayaLainLain);
  document.getElementById("ringkasanTOTAL").textContent =
    formatRupiah(totalBiayaProduksi);

  document.getElementById("persenBB").textContent = persenBB.toFixed(2) + "%";
  document.getElementById("persenBTKL").textContent =
    persenBTKL.toFixed(2) + "%";
  document.getElementById("persenBOP").textContent = persenBOP.toFixed(2) + "%";
}

/**
 * Menggambar grafik komposisi biaya menggunakan Chart.js
 * @param {object} hasil Hasil perhitungan HPP
 */
function drawBiayaChart(hasil) {
  const ctx = document.getElementById("biayaChart").getContext("2d");
  const { totalBahanBaku, totalTenagaKerja, totalBiayaLainLain } = hasil;

  // Jika chart sudah ada, hancurkan dulu
  if (biayaChart) {
    biayaChart.destroy();
  }

  biayaChart = new Chart(ctx, {
    type: "bar", // Menggunakan chart batang (bar)
    data: {
      labels: ["Bahan Baku", "Tenaga Kerja", "Overhead (Lain-lain)"],
      datasets: [
        {
          label: "Komposisi Biaya Produksi (Rp)",
          data: [totalBahanBaku, totalTenagaKerja, totalBiayaLainLain],
          backgroundColor: [
            "rgba(106, 147, 203, 0.8)", // Skyblue
            "rgba(255, 159, 64, 0.8)", // Orange
            "rgba(75, 192, 192, 0.8)", // Teal
          ],
          borderColor: [
            "rgba(106, 147, 203, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Biaya (Rp)",
          },
          ticks: {
            // Format tick label sebagai Rupiah
            callback: function (value) {
              return formatRupiah(value).replace("Rp ", "");
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "Komposisi Biaya Produksi",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += formatRupiah(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
    },
  });
}

// =========================================================================
// Bagian 4: Riwayat (localStorage) & Penyimpanan
// =========================================================================

const RIWAYAT_KEY = "hppRiwayat";

/**
 * Menyimpan perhitungan saat ini ke `localStorage`
 */
function simpanKeRiwayat() {
  if (!currentCalculation) {
    alert(
      "Tidak ada hasil perhitungan untuk disimpan. Mohon hitung HPP terlebih dahulu.",
    );
    return;
  }

  const riwayat = JSON.parse(localStorage.getItem(RIWAYAT_KEY) || "[]");

  // Tambahkan ID unik untuk identifikasi
  const newId = Date.now();
  const dataToSave = {
    ...currentCalculation,
    id: newId,
    waktuSimpan: new Date().toLocaleString("id-ID"),
  };

  riwayat.unshift(dataToSave); // Tambahkan di depan

  localStorage.setItem(RIWAYAT_KEY, JSON.stringify(riwayat));

  alert(
    `Perhitungan untuk produk "${currentCalculation.namaProduk}" berhasil disimpan ke Riwayat!`,
  );

  // Arahkan ke Riwayat
  showSection("riwayat");
}

/**
 * Memuat dan menampilkan daftar riwayat dari `localStorage`
 */
function loadRiwayat() {
  const riwayatListEl = document.getElementById("riwayat-list");
  const riwayatKosongEl = document.getElementById("riwayat-kosong");
  riwayatListEl.innerHTML = "";

  const riwayat = JSON.parse(localStorage.getItem(RIWAYAT_KEY) || "[]");

  if (riwayat.length === 0) {
    riwayatKosongEl.style.display = "block";
    return;
  }
  riwayatKosongEl.style.display = "none";

  riwayat.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.classList.add("card", "riwayat-item");

    itemEl.innerHTML = `
            <div>
                <strong>${item.namaProduk}</strong>
                <p>Waktu: ${item.waktuSimpan}</p>
                <p>Total Biaya: ${formatRupiah(item.totalBiayaProduksi)}</p>
                <p>HPP per Unit: <strong>${formatRupiah(
                  item.hppPerUnit,
                )}</strong></p>
            </div>
            <div class="riwayat-actions">
                <button onclick="viewRiwayatDetail(${
                  item.id
                })">Lihat Detail</button>
                <button class="btn-reset" onclick="editRiwayat(${
                  item.id
                })">Edit</button>
                <button class="btn-remove" onclick="deleteRiwayat(${
                  item.id
                })">Hapus</button>
            </div>
        `;
    riwayatListEl.appendChild(itemEl);
  });
}

/**
 * Menampilkan detail riwayat perhitungan
 * @param {number} id ID dari item riwayat
 */
function viewRiwayatDetail(id) {
  const riwayat = JSON.parse(localStorage.getItem(RIWAYAT_KEY) || "[]");
  const item = riwayat.find((r) => r.id === id);

  if (item) {
    // Tampilkan hasil di Kalkulator
    currentCalculation = item;
    displayResults(item);

    // Tampilkan Harga Jual jika ada
    if (item.hargaJualSaran) {
      document.getElementById("marginLaba").value = item.marginLabaPersen;
      hitungHargaJual();
    } else {
      document.querySelector(".harga-jual-output").classList.add("hidden");
    }

    alert(`Menampilkan detail perhitungan untuk produk "${item.namaProduk}".`);
    showSection("kalkulator");
  }
}

/**
 * Mengisi form dengan data riwayat untuk diedit
 * @param {number} id ID dari item riwayat
 */
function editRiwayat(id) {
  const riwayat = JSON.parse(localStorage.getItem(RIWAYAT_KEY) || "[]");
  const item = riwayat.find((r) => r.id === id);

  if (item) {
    // Isi input non-dinamis
    document.getElementById("productName").value = item.namaProduk;
    document.getElementById("jumlahUnit").value = item.jumlahUnit;
    document.getElementById("biayaTenagaKerja").value = item.totalTenagaKerja;
    document.getElementById("marginLaba").value = item.marginLabaPersen || 20;

    // Isi input dinamis (Hapus yang lama, tambah yang baru)
    document.getElementById("bahanBakuContainer").innerHTML = "";
    item.biayaBahanBakuDetail.forEach((bb) =>
      addItemRow("bahanBaku", "BB", bb.cost, bb.name),
    );

    document.getElementById("biayaLainLainContainer").innerHTML = "";
    item.biayaLainLainDetail.forEach((bop) =>
      addItemRow("biayaLainLain", "BOP", bop.cost, bop.name),
    );

    // Update total ringkasan
    updateTotalSummary("bahanBaku");
    updateTotalSummary("biayaLainLain");
    document
      .getElementById("biayaTenagaKerja")
      .dispatchEvent(new Event("input")); // Update display BTKL

    // Hapus item lama dari riwayat setelah di-load ke form
    deleteRiwayat(id, false);

    alert(
      `Data produk "${item.namaProduk}" dimuat ke kalkulator untuk diedit. Jangan lupa 'Hitung HPP' kembali dan 'Simpan ke Riwayat' jika sudah selesai.`,
    );
    showSection("kalkulator");
  }
}

/**
 * Menghapus item riwayat
 * @param {number} id ID dari item riwayat
 * @param {boolean} reload Apakah perlu memuat ulang list riwayat (default: true)
 */
function deleteRiwayat(id, reload = true) {
  let riwayat = JSON.parse(localStorage.getItem(RIWAYAT_KEY) || "[]");
  const initialLength = riwayat.length;
  riwayat = riwayat.filter((r) => r.id !== id);

  if (riwayat.length < initialLength) {
    localStorage.setItem(RIWAYAT_KEY, JSON.stringify(riwayat));
    if (reload) {
      alert("Riwayat berhasil dihapus.");
      loadRiwayat();
    }
  }
}

/**
 * Mereset form input
 */
function resetForm() {
  document.getElementById("hpp-form").reset();
  document.getElementById("bahanBakuContainer").innerHTML = "";
  document.getElementById("biayaLainLainContainer").innerHTML = "";
  document.getElementById("hasil-perhitungan").classList.add("hidden");
  currentCalculation = null;
  fillDummyData(); // Isi kembali dengan data dummy untuk kemudahan
}

// =========================================================================
// Bagian 5: Export ke PDF (jsPDF)
// =========================================================================

/**
 * Export hasil perhitungan saat ini ke PDF
 */
function exportToPDF() {
  if (!currentCalculation) {
    alert(
      "Tidak ada hasil perhitungan untuk diexport. Mohon hitung HPP terlebih dahulu.",
    );
    return;
  }

  // Cara yang benar
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const data = currentCalculation;
  let y = 15;

  // dst...

  // Judul
  doc.setFontSize(18);
  doc.text(`Laporan HPP Produk: ${data.namaProduk}`, 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.text(
    `Tanggal Perhitungan: ${new Date(data.tanggalPerhitungan).toLocaleString(
      "id-ID",
    )}`,
    14,
    y,
  );
  y += 10;
  doc.line(14, y, 196, y);
  y += 5;

  // Ringkasan Angka
  doc.setFontSize(12);
  doc.text(
    `Unit Produksi: ${data.jumlahUnit.toLocaleString("id-ID")} unit`,
    14,
    y,
  );
  y += 7;
  doc.text(
    `Total Biaya Produksi: ${formatRupiah(data.totalBiayaProduksi)}`,
    14,
    y,
  );
  y += 7;
  doc.setFontSize(14);
  doc.text(`HPP per Unit: ${formatRupiah(data.hppPerUnit)}`, 14, y);
  y += 10;

  // Harga Jual Saran
  if (data.hargaJualSaran) {
    doc.setFontSize(12);
    doc.text(
      `Harga Jual Saran (Margin ${data.marginLabaPersen}%): ${formatRupiah(
        data.hargaJualSaran,
      )}`,
      14,
      y,
    );
    y += 10;
  }

  // Tabel Rincian Biaya
  doc.setFontSize(12);
  doc.text("Rincian Biaya per Komponen", 14, y);
  y += 5;

  const tableData = [
    ["Komponen", "Nama Item", "Biaya (Rp)"],
    // Bahan Baku
    ...data.biayaBahanBakuDetail.map((item) => [
      "Bahan Baku",
      item.name,
      formatRupiah(item.cost),
    ]),
    ["", "TOTAL Bahan Baku", formatRupiah(data.totalBahanBaku)],
    // Tenaga Kerja
    ["Tenaga Kerja", "Total Upah/Gaji", formatRupiah(data.totalTenagaKerja)],
    // Biaya Lain-Lain/Overhead
    ...data.biayaLainLainDetail.map((item) => [
      "Overhead",
      item.name,
      formatRupiah(item.cost),
    ]),
    ["", "TOTAL Overhead", formatRupiah(data.totalBiayaLainLain)],
  ];

  doc.autoTable({
    startY: y,
    head: [["Komponen", "Nama Item", "Biaya"]],
    body: tableData.filter((row) => row[0] !== "Komponen"), // Hapus header duplikat
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 90 },
      2: { cellWidth: 50, halign: "right" },
    },
    didDrawCell: (data) => {
      // Beri highlight untuk total
      if (data.row.raw[1].startsWith("TOTAL")) {
        doc.setFillColor(230, 230, 250); // Light purple-blue
      }
    },
  });

  // Pindah y ke akhir tabel
  y = doc.autoTable.previous.finalY + 10;

  // Tangkap grafik (Opsional, jika ingin menyertakan gambar grafik)
  const chartCanvas = document.getElementById("biayaChart");
  if (chartCanvas) {
    doc.setFontSize(12);
    doc.text("Grafik Komposisi Biaya", 14, y);
    y += 5;

    // Pindai canvas ke image data
    const imgData = chartCanvas.toDataURL("image/png");
    const imgWidth = 180;
    const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;

    if (y + imgHeight > 280) {
      // Cek jika tidak muat di halaman
      doc.addPage();
      y = 15;
    }
    doc.addImage(imgData, "PNG", 14, y, imgWidth, imgHeight);
    y += imgHeight;
  }

  // Simpan file
  doc.save(
    `Laporan_HPP_${data.namaProduk.replace(/\s/g, "_")}_${Date.now()}.pdf`,
  );
}

// =========================================================================
// Bagian 6: Komentar Integrasi Backend (Sesuai Spesifikasi)
// =========================================================================

/*
 * ========================================================================
 * HOOK UNTUK INTEGRASI BACKEND / MULTI-USER (OPSIONAL)
 * ========================================================================
 * * Aplikasi ini saat ini hanya menggunakan localStorage (frontend-only).
 * Untuk mendukung multi-user dan sinkronisasi data antar perangkat,
 * fungsi-fungsi berikut perlu dimodifikasi untuk berinteraksi dengan API Backend.
 */

// Konfigurasi contoh untuk Firebase (jika digunakan)
// const FIREBASE_CONFIG = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "hpp-kalkulator-app",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };
// firebase.initializeApp(FIREBASE_CONFIG);
// const db = firebase.firestore();
// let currentUserId = null; // ID pengguna yang sedang login

/**
 * [Backend Hook] Gantikan `localStorage` saat menyimpan ke Riwayat
 * @param {object} data Data perhitungan HPP
 */
/*
async function simpanHPPToBackend(data) {
    // if (!currentUserId) { throw new Error("User not logged in."); }
    // try {
    //     await db.collection("calculations").add({
    //         ...data,
    //         userId: currentUserId,
    //         timestamp: firebase.firestore.FieldValue.serverTimestamp()
    //     });
    //     alert("Data berhasil disinkronkan ke cloud!");
    // } catch (error) {
    //     console.error("Error writing document: ", error);
    //     alert("Gagal menyimpan ke cloud. Coba lagi.");
    // }
}
*/

/**
 * [Backend Hook] Gantikan `localStorage` saat memuat Riwayat
 */
/*
async function loadRiwayatFromBackend() {
    // if (!currentUserId) return []; 
    // try {
    //     const snapshot = await db.collection("calculations")
    //                             .where("userId", "==", currentUserId)
    //                             .orderBy("timestamp", "desc")
    //                             .get();
    //     const riwayatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //     // Update DOM dengan riwayatData
    //     return riwayatData;
    // } catch (error) {
    //     console.error("Error getting documents: ", error);
    //     return [];
    // }
}
*/
