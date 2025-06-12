// مثلاً: src/utils/registerCairoFont.js

import { jsPDF } from "jspdf";
import { cairoFontBase64 } from "@/public/fonts/CairoRegular-base64.js"; // المسار حسب مشروعك

// دالة لتسجيل خطّ Cairo في jsPDF قبل الرسم
const callAddFont = function () {
  // 1. أضف ملف Cairo بصيغة Base64 إلى Virtual File System
  this.addFileToVFS("Cairo-Regular.ttf", cairoFontBase64);

  // 2. سجّل الخطّ تحت الاسم "Cairo" بنمط "normal"
  this.addFont("Cairo-Regular.ttf", "Cairo", "normal");
};

// ادفع الدالة إلى حدث "addFonts" حتى يتم استدعاؤها داخليًا قبل بدء الرسم
jsPDF.API.events.push(["addFonts", callAddFont]);

// إن احتجت إلى استخدام cairoFontBase64 في مكان آخر يمكنك تصديره
export { cairoFontBase64 };
