// app/admin/relations/page.tsx
"use client";
import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";

type Division   = { id: number; name: string };
type Department = { id: number; name: string };
type Section    = { id: number; name: string };
type DevcType   = { id: number; name: string };
type Description= { id: number; name: string };

type Device = {
  id: number;
  noDv: number;
  caseDesc: string;
  typeId: number;
  typeName: string;
  divisionId: number;
  departmentId: number;
  sectionId: number;
};

type DeviceDetails = {
  id: number;
  noDv: number;
  caseDesc: string;
  typeId: number;
  typeName: string;
  divisionId: number;
  divisionName: string;
  departmentId: number;
  departmentName: string;
  sectionId: number;
  sectionName: string;
  notes: string;
  descriptionId: number;
  descriptionName: string;
  cpu: string;
  ram: string;
  hard: string;
  vga: string;
};

type Request = {
  id: number;
  date: string;
  note: string;
  deviceNo: number;
  deviceType: string;
};

export default function RelationsPage() {
  // قوائم الاختيار
  const [divisions,   setDivisions]   = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections,    setSections]    = useState<Section[]>([]);
  const [types,       setTypes]       = useState<DevcType[]>([]);
  const [descriptions,setDescriptions]= useState<Description[]>([]);

  // البيانات
  const [devices,  setDevices]  = useState<Device[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // القيم المختارة
  const [selDiv,  setSelDiv]  = useState<number|null>(null);
  const [selDept, setSelDept] = useState<number|null>(null);
  const [selSec,  setSelSec]  = useState<number|null>(null);

  // نموذج الإضافة/التعديل
  const [form,      setForm]      = useState<Partial<Device & {
    notes: string;
    descriptionId: number;
    cpu: string;
    ram: string;
    hard: string;
    vga: string;
  }>>({});
  const [editingId, setEditingId] = useState<number|null>(null);

  // أوليّات: جلب خيارات Dropdown
  useEffect(() => {
    fetch("/api/divisions").then(r=>r.json()).then(setDivisions);
    fetch("/api/devctypes").then(r=>r.json()).then(setTypes);
    fetch("/api/descriptions").then(r=>r.json()).then(setDescriptions);
  }, []);

  // عند اختيار تشكيل → جلب الأقسام
  useEffect(() => {
    if (!selDiv) return setDepartments([]);
    fetch(`/api/departments?divisionId=${selDiv}`)
      .then(r=>r.json()).then(setDepartments);
    setSelDept(null); setSections([]); setSelSec(null);
    setDevices([]); setRequests([]);
  }, [selDiv]);

  // عند اختيار قسم → جلب الشُّعب
  useEffect(() => {
    if (!selDept) return setSections([]);
    fetch(`/api/sections?departmentId=${selDept}`)
      .then(r=>r.json()).then(setSections);
    setSelSec(null); setDevices([]); setRequests([]);
  }, [selDept]);

  // تغيير حقول النموذج
  function onFieldChange(e: ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === "number" ? +value : value
    }));
  }

  // إضافة أو تعديل جهاز
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selDiv || !selDept || !selSec) {
      alert("يرجى اختيار التشكيل والقسم والشعبة أولاً.");
      return;
    }
    const method = editingId ? "PUT" : "POST";
    await fetch("/api/devices", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        noDv: form.noDv,
        caseDesc: form.caseDesc,
        typeId: form.typeId,
        divisionId: selDiv,
        departmentId: selDept,
        sectionId: selSec,
        notes: form.notes || "",
        descriptionId: form.descriptionId,
        cpu: form.cpu || "",
        ram: form.ram || "",
        hard: form.hard || "",
        vga: form.vga || ""
      })
    });
    setForm({});
    setEditingId(null);
    loadDevicesSection();
  }

  // بداية تعديل جهاز
  async function startEdit(d: Device) {
    setSelDiv(d.divisionId);
    const deps = await fetch(`/api/departments?divisionId=${d.divisionId}`).then(r=>r.json());
    setDepartments(deps);
    setSelDept(d.departmentId);
    const secs = await fetch(`/api/sections?departmentId=${d.departmentId}`).then(r=>r.json());
    setSections(secs);
    setSelSec(d.sectionId);

    // جلب تفاصيل الجهاز لملء النموذج
    const details = await fetch(`/api/devices/${d.id}`).then(r=>r.json()) as DeviceDetails;
    setForm({
      noDv: details.noDv,
      caseDesc: details.caseDesc,
      typeId: details.typeId,
      notes: details.notes,
      descriptionId: details.descriptionId,
      cpu: details.cpu,
      ram: details.ram,
      hard: details.hard,
      vga: details.vga
    });
    setEditingId(d.id);
  }

  // حذف جهاز
  async function deleteDevice(id: number) {
    if (!confirm("هل أنت متأكد من حذف الجهاز؟")) return;
    await fetch(`/api/devices?id=${id}`, { method: "DELETE" });
    loadDevicesSection();
  }

  // تحميل الأجهزة حسب المستوى
  function loadDevicesDivision() {
    if (!selDiv) return;
    fetch(`/api/devices?divisionId=${selDiv}`)
      .then(r=>r.json()).then(setDevices);
    setRequests([]);
  }
  function loadDevicesDepartment() {
    if (!selDept) return;
    fetch(`/api/devices?divisionId=${selDiv}&departmentId=${selDept}`)
      .then(r=>r.json()).then(setDevices);
    setRequests([]);
  }
  function loadDevicesSection() {
    if (!selSec) return;
    fetch(`/api/devices?divisionId=${selDiv}&departmentId=${selDept}&sectionId=${selSec}`)
      .then(r=>r.json()).then(setDevices);
    setRequests([]);
  }

  // عرض تفاصيل جهاز
  async function showDeviceDetails(id: number) {
    const d = await fetch(`/api/devices/${id}`).then(r=>r.json()) as DeviceDetails;
    alert(`
#${d.id}
التشكيل: ${d.divisionName}
القسم: ${d.departmentName}
الشعبة: ${d.sectionName}

نوع الجهاز: ${d.typeName}
رقم الجهاز: ${d.noDv}
الحالة: ${d.caseDesc}

ملاحظات:
${d.notes || "—"}

وصف إضافي:
(${d.descriptionId || "-"}) ${d.descriptionName || "—"}

المواصفات التقنية:
CPU: ${d.cpu}
RAM: ${d.ram}
HDD: ${d.hard}
VGA: ${d.vga}
    `.trim());
  }

  // عرض طلبات الصيانة للشعبة
  function loadRequestsSection() {
    if (!selSec) return;
    fetch(`/api/requests?divisionId=${selDiv}&departmentId=${selDept}&sectionId=${selSec}`)
      .then(r=>r.json()).then(setRequests);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>هيكل: التشكيل &gt;&gt; القسم &gt;&gt; الشعبة</h1>

      {/* اختيار التشكيل */}
      <div>
        <select
          value={selDiv ?? ""}
          onChange={e => setSelDiv(e.target.value ? +e.target.value : null)}
        >
          <option value="">— اختر تشكيل —</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>{" "}
        <button onClick={loadDevicesDivision} disabled={!selDiv}>
          عرض أجهزة التشكيل
        </button>
      </div>

      {/* اختيار القسم */}
      <div style={{ marginTop: 10 }}>
        <select
          disabled={!selDiv}
          value={selDept ?? ""}
          onChange={e => setSelDept(e.target.value ? +e.target.value : null)}
        >
          <option value="">— اختر قسم —</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>{" "}
        <button onClick={loadDevicesDepartment} disabled={!selDept}>
          عرض أجهزة القسم
        </button>
      </div>

      {/* اختيار الشعبة */}
      <div style={{ marginTop: 10 }}>
        <select
          disabled={!selDept}
          value={selSec ?? ""}
          onChange={e => setSelSec(e.target.value ? +e.target.value : null)}
        >
          <option value="">— اختر شعبة —</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>{" "}
        <button onClick={loadDevicesSection} disabled={!selSec}>
          عرض أجهزة الشعبة
        </button>{" "}
        <button onClick={loadRequestsSection} disabled={!selSec}>
          عرض طلبات الشعبة
        </button>
      </div>

      {/* نموذج إضافة/تعديل جهاز */}
      {selSec && (
        <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
          <h2>{editingId ? "تعديل جهاز" : "إضافة جهاز جديد"}</h2>
          <div>
            <input
              name="noDv"
              type="number"
              placeholder="رقم الجهاز"
              value={form.noDv ?? ""}
              onChange={onFieldChange}
            />{" "}
            <input
              name="caseDesc"
              type="text"
              placeholder="الحالة"
              value={form.caseDesc ?? ""}
              onChange={onFieldChange}
            />{" "}
            <select
              name="typeId"
              value={form.typeId ?? ""}
              onChange={onFieldChange}
            >
              <option value="">— نوع الجهاز —</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>ملاحظات:</label><br />
            <textarea
              name="notes"
              rows={3}
              value={form.notes ?? ""}
              onChange={onFieldChange}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <label>الوصف الإضافي:</label><br />
            <select
              name="descriptionId"
              value={form.descriptionId ?? ""}
              onChange={onFieldChange}
            >
              <option value="">— اختر وصفًا —</option>
              {descriptions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>CPU:</label><br />
            <textarea
              name="cpu"
              rows={1}
              value={form.cpu ?? ""}
              onChange={onFieldChange}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>RAM:</label><br />
            <textarea
              name="ram"
              rows={1}
              value={form.ram ?? ""}
              onChange={onFieldChange}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Hard:</label><br />
            <textarea
              name="hard"
              rows={1}
              value={form.hard ?? ""}
              onChange={onFieldChange}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>VGA:</label><br />
            <textarea
              name="vga"
              rows={1}
              value={form.vga ?? ""}
              onChange={onFieldChange}
            />
          </div>

          <button type="submit" style={{ marginTop: 10 }}>
            {editingId ? "حفظ التعديل" : "إضافة الجهاز"}
          </button>
          {editingId && (
            <button
              type="button"
              style={{ marginLeft: 10 }}
              onClick={() => { setEditingId(null); setForm({}); }}
            >
              إلغاء
            </button>
          )}
        </form>
      )}

      {/* جدول الأجهزة */}
      {devices.length > 0 && (
        <>
          <h2 style={{ marginTop: 30 }}>قائمة الأجهزة</h2>
          <table border={1} cellPadding={5}>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الجهاز</th>
                <th>الحالة</th>
                <th>النوع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.noDv}</td>
                  <td>{d.caseDesc}</td>
                  <td>{d.typeName}</td>
                  <td>
                    <button onClick={() => startEdit(d)}>✎</button>{" "}
                    <button onClick={() => deleteDevice(d.id)}>🗑</button>{" "}
                    <button onClick={() => showDeviceDetails(d.id)}>🔍</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* جدول الطلبات */}
      {requests.length > 0 && (
        <>
          <h2 style={{ marginTop: 30 }}>قائمة الطلبات</h2>
          <table border={1} cellPadding={5}>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>رقم الجهاز</th>
                <th>النوع</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
                  <td>{r.deviceNo}</td>
                  <td>{r.deviceType}</td>
                  <td>
                    <button onClick={() => alert(
                      `#${r.id}\nتاريخ: ${new Date(r.date).toISOString().slice(0, 10)}\nملاحظة: ${r.note}`
                    )}>🔍</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
