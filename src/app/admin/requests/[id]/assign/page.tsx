'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AssignEmployeePage() {
  const { id } = useParams();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      const res = await fetch('/api/admin/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, []);

  const handleAssign = async () => {
    const res = await fetch(`/api/admin/requests/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedEmployee }),
    });

    if (res.ok) {
      alert('تم توجيه الطلب بنجاح');
      router.push('/admin/requests');
    } else {
      const data = await res.json();
      alert(data.error || 'فشل توجيه الطلب');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">توجيه الطلب رقم {id}</h1>

      <select
        value={selectedEmployee}
        onChange={(e) => setSelectedEmployee(e.target.value)}
        className="w-full p-2 border rounded mb-6"
      >
        <option value="">اختر موظفًا</option>
        {employees.map((emp: any) => (
          <option key={emp.UserID} value={emp.UserID}>
            {emp.FullName}
          </option>
        ))}
      </select>

      <button onClick={handleAssign} className="bg-green-600 text-white py-2 px-4 rounded w-full">
        توجيه الطلب
      </button>
    </div>
  );
}
