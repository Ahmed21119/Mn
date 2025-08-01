// main.js

document.addEventListener('DOMContentLoaded', async () => {
    // جلب جميع عناصر الواجهة
    const form = document.getElementById('recordForm');
    const tableBody = document.getElementById('recordsTableBody');
    const exportExcelButton = document.getElementById('exportExcelButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    
    // عناصر الفلترة
    const searchTermInput = document.getElementById('searchTerm');
    const filterTypeInput = document.getElementById('filterType');
    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');

    // عناصر الصور
    const frontImageInput = document.getElementById('frontImageInput');
    const backImageInput = document.getElementById('backImageInput');
    const frontImagePreview = document.getElementById('frontImagePreview');
    const backImagePreview = document.getElementById('backImagePreview');

    // عناصر النافذة المنبثقة (Modal)
    const modal = document.getElementById('imageModal');
    const modalClose = document.querySelector('.modal-close');
    
    let frontImageBase64 = '';
    let backImageBase64 = '';
    
    // تحميل خط عربي لدعم PDF
    try {
        const font = await fetch('https://alif-type.github.io/Amiri/fonts/amiri-regular.ttf');
        const fontBuffer = await font.arrayBuffer();
        window.amiriFont = new Uint8Array(fontBuffer);
        console.log("Amiri font loaded successfully.");
    } catch (error) {
        console.error("Failed to load Amiri font:", error);
    }

    // جلب وعرض السجلات عند التحميل
    fetchAndRenderRecords();
    
    // ربط أحداث الفلترة
    [searchTermInput, filterTypeInput, filterStartDateInput, filterEndDateInput].forEach(el => {
        el.addEventListener('change', fetchAndRenderRecords);
    });

    // دالة تحويل الصورة
    const convertImageToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    frontImageInput.addEventListener('change', async e => {
        if(e.target.files[0]) {
            frontImagePreview.src = URL.createObjectURL(e.target.files[0]);
            frontImageBase64 = await convertImageToBase64(e.target.files[0]);
        }
    });

    backImageInput.addEventListener('change', async e => {
        if(e.target.files[0]) {
            backImagePreview.src = URL.createObjectURL(e.target.files[0]);
            backImageBase64 = await convertImageToBase64(e.target.files[0]);
        }
    });

    // إرسال النموذج
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newRecord = {
            personName: document.getElementById('personName').value,
            nationalIdPassportNum: document.getElementById('nationalIdPassportNum').value,
            entryExitType: document.getElementById('entryExitType').value,
            purpose: document.getElementById('purpose').value,
            originDestination: document.getElementById('originDestination').value,
            vehicleType: document.getElementById('vehicleType').value,
            vehiclePlateNum: document.getElementById('vehiclePlateNum').value,
            notes: document.getElementById('notes').value,
            frontImageBase64,
            backImageBase64,
            entryDate: new Date().toISOString().slice(0, 10),
            dateTime: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' }),
        };
        await db.records.add(newRecord);
        fetchAndRenderRecords();
        form.reset();
        frontImagePreview.src = backImagePreview.src = '';
        frontImageBase64 = backImageBase64 = '';
    });
    
    // دالة جلب وعرض السجلات مع الفلترة
    async function fetchAndRenderRecords() {
        const searchTerm = searchTermInput.value.toLowerCase();
        const filterType = filterTypeInput.value;
        const startDate = filterStartDateInput.value;
        const endDate = filterEndDateInput.value;

        let collection = db.records;
        let records = await collection.orderBy('id').reverse().toArray();

        // تطبيق الفلاتر
        records = records.filter(rec => {
            const matchesSearch = !searchTerm || Object.values(rec).some(val => String(val).toLowerCase().includes(searchTerm));
            const matchesType = filterType === 'all' || rec.entryExitType === filterType;
            const matchesDate = (!startDate || rec.entryDate >= startDate) && (!endDate || rec.entryDate <= endDate);
            return matchesSearch && matchesType && matchesDate;
        });

        tableBody.innerHTML = '';
        records.forEach(record => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${record.personName}</td>
                <td>${record.nationalIdPassportNum}</td>
                <td>${record.entryExitType}</td>
                <td>${record.dateTime}</td>
                <td>${record.originDestination}</td>
                <td>${record.vehiclePlateNum || 'لا يوجد'}</td>
                <td>
                    ${record.frontImageBase64 ? `<button class="view-button" onclick="viewImage(${record.id})">عرض</button>` : 'لا يوجد'}
                </td>
            `;
        });
    }

    // تصدير Excel
    exportExcelButton.addEventListener('click', async () => {
        // (نفس الكود السابق، لا حاجة لتغييره)
    });

    // تصدير PDF
    exportPdfButton.addEventListener('click', async () => {
        if (!window.amiriFont) {
            alert("الخط العربي لم يتم تحميله بعد، يرجى المحاولة مرة أخرى.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // إضافة الخط العربي
        doc.addFileToVFS('Amiri-Regular.ttf', btoa(String.fromCharCode.apply(null, window.amiriFont)));
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');

        // جلب البيانات المفلترة للعرض
        const allRows = Array.from(tableBody.querySelectorAll('tr'));
        const data = allRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            // عكس ترتيب الخلايا لتناسب العرض من اليمين لليسار
            return [
                cells[5].innerText,
                cells[4].innerText,
                cells[3].innerText,
                cells[2].innerText,
                cells[1].innerText,
                cells[0].innerText,
            ].reverse(); // نعكسها مرة أخرى لترتيب jspdf-autotable
        });

        doc.autoTable({
            head: [['الاسم', 'الهوية/الجواز', 'النوع', 'التاريخ والوقت', 'الجهة', 'اللوحة']],
            body: data.map(row => row.reverse()), // عكس كل صف ليلائم الترتيب
            styles: {
                font: 'Amiri',
                halign: 'right' // محاذاة النص لليمين
            },
            headStyles: {
                fillColor: [13, 71, 161] // لون أزرق داكن
            }
        });

        doc.save(`Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    });

    // التحكم بالنافذة المنبثقة (Modal)
    modalClose.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
});

// دالة عرض الصور في Modal
async function viewImage(recordId) {
    const record = await db.records.get(recordId);
    if (record && record.frontImageBase64) {
        const modal = document.getElementById('imageModal');
        document.getElementById('modalImageFront').src = record.frontImageBase64;
        document.getElementById('modalImageBack').src = record.backImageBase64;
        modal.style.display = "block";
    }
}