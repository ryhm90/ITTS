// app/admin/manage/page.tsx
"use client";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";

type Dept = { id: number; divisionId: number; name: string };
type Sect = { id: number; divisionId: number; departmentId: number; name: string };

export default function ManagePage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [sects, setSects] = useState<Sect[]>([]);
  const [formDept, setFormDept] = useState<Partial<Dept>>({});
  const [formSect, setFormSect] = useState<Partial<Sect>>({});
  const [editDeptId, setEditDeptId] = useState<number|null>(null);
  const [editSectId, setEditSectId] = useState<number|null>(null);

  async function fetchAll() {
    const [d, s] = await Promise.all([
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/sections").then(r => r.json())
    ]);
    setDepts(d);
    setSects(s);
  }
  useEffect(() => { fetchAll(); }, []);

  // إضافة/تعديل قسم
  async function onDeptSubmit(e: FormEvent) {
    e.preventDefault();
    const url = "/api/departments";
    const method = editDeptId ? "PUT" : "POST";
    const body = editDeptId
      ? { id: editDeptId, id1: formDept.divisionId, name: formDept.name }
      : { id1: formDept.divisionId, name: formDept.name };
    await fetch(url, { method, headers:{ "Content-Type":"application/json"}, body: JSON.stringify(body) });
    setFormDept({}); setEditDeptId(null);
    fetchAll();
  }

  // إضافة/تعديل شعبة
  async function onSectSubmit(e: FormEvent) {
    e.preventDefault();
    const url = "/api/sections";
    const method = editSectId ? "PUT" : "POST";
    const body = editSectId
      ? { id: editSectId, divisionId: formSect.divisionId, departmentId: formSect.departmentId, name: formSect.name }
      : { divisionId: formSect.divisionId, departmentId: formSect.departmentId, name: formSect.name };
    await fetch(url, { method, headers:{ "Content-Type":"application/json"}, body: JSON.stringify(body) });
    setFormSect({}); setEditSectId(null);
    fetchAll();
  }

  return (
    <div style={{ padding:20 }}>
      <h1>إدارة الأقسام والشُّعب</h1>

      <section style={{ marginTop: 30 }}>
        <h2>القسم</h2>
        <form onSubmit={onDeptSubmit}>
          <input
            placeholder="Division ID (رقم الجهة)"
            type="number"
            value={formDept.divisionId||""}
            onChange={(e:ChangeEvent<HTMLInputElement>)=>setFormDept(f=>({...f, divisionId:+e.target.value}))}
          />{" "}
          <input
            placeholder="اسم القسم"
            value={formDept.name||""}
            onChange={(e)=>setFormDept(f=>({...f, name:e.target.value}))}
          />{" "}
          <button type="submit">{editDeptId ? "تعديل" : "إضافة"}</button>
          {editDeptId && <button onClick={()=>{setEditDeptId(null); setFormDept({});}}>إلغاء</button>}
        </form>
        <ul>
          {depts.map(d =>
            <li key={d.id}>
              [{d.divisionId}] {d.name}{" "}
              <button onClick={()=>{ setEditDeptId(d.id); setFormDept({divisionId:d.divisionId,name:d.name}); }}>
                ✎
              </button>
            </li>
          )}
        </ul>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>الشعبة</h2>
        <form onSubmit={onSectSubmit}>
          <select
            value={formSect.divisionId||""}
            onChange={e=>setFormSect(f=>({...f, divisionId:+e.target.value}))}
          >
            <option value="">— الجهة —</option>
            {depts.map(d=> <option key={d.id} value={d.divisionId}>{d.name}</option>)}
          </select>{" "}
          <select
            value={formSect.departmentId||""}
            onChange={e=>setFormSect(f=>({...f, departmentId:+e.target.value}))}
          >
            <option value="">— القسم —</option>
            {depts
              .filter(d=>d.divisionId===formSect.divisionId)
              .map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>{" "}
          <input
            placeholder="اسم الشعبة"
            value={formSect.name||""}
            onChange={e=>setFormSect(f=>({...f, name:e.target.value}))}
          />{" "}
          <button type="submit">{editSectId ? "تعديل" : "إضافة"}</button>
          {editSectId && <button onClick={()=>{setEditSectId(null); setFormSect({});}}>إلغاء</button>}
        </form>

        <ul>
          {sects.map(s =>
            <li key={s.id}>
              [جهة {s.divisionId} – قسم {s.departmentId}] {s.name}{" "}
              <button onClick={()=>{ setEditSectId(s.id); setFormSect({divisionId:s.divisionId,departmentId:s.departmentId,name:s.name}); }}>
                ✎
              </button>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
