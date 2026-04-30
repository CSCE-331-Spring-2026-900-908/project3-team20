'use client';

import { useEffect, useState } from 'react';
import { Employee } from '@/types';

type EmployeeRole = 'cashier' | 'manager';
type EmployeeForm = {
  employeeid: string;
  name: string;
  role: EmployeeRole;
  email: string;
};

const EMPTY_FORM: EmployeeForm = {
  employeeid: '',
  name: '',
  role: 'cashier',
  email: '',
};

function roleLabel(role: boolean) {
  return role ? 'Manager' : 'Cashier';
}

function roleValue(role: boolean): EmployeeRole {
  return role ? 'manager' : 'cashier';
}

function parseEmployeeId(value: string) {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');

  useEffect(() => {
    const name = localStorage.getItem('employeeName');
    if (name) setEmployeeName(name);
  }, []);

  const fetchEmployees = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setLoadError('');

    try {
      const res = await fetch('/api/employees');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch employees');
      }

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch employees';
      setLoadError(message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEmployees();
  }, []);

  const managerCount = employees.filter(employee => employee.role).length;
  const cashierCount = employees.length - managerCount;
  const nextEmployeeId = employees.reduce(
    (maxEmployeeId, employee) => Math.max(maxEmployeeId, employee.employeeid),
    0
  ) + 1;

  const resetMessages = () => {
    setActionError('');
    setActionMessage('');
  };

  const openAdd = () => {
    resetMessages();
    setForm({
      employeeid: String(nextEmployeeId),
      name: '',
      role: 'cashier',
      email: '',
    });
    setFormError('');
    setFormMode('add');
  };

  const openEdit = (employee: Employee) => {
    resetMessages();
    setForm({
      employeeid: String(employee.employeeid),
      name: employee.name,
      role: roleValue(employee.role),
      email: employee.email ?? '',
    });
    setFormError('');
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async () => {
    const parsedEmployeeId = parseEmployeeId(form.employeeid);
    const trimmedName = form.name.trim();

    if (!parsedEmployeeId) {
      setFormError('Employee ID must be a positive whole number.');
      return;
    }

    if (!trimmedName) {
      setFormError('Employee name cannot be empty.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    resetMessages();

    try {
      const res = await fetch('/api/employees', {
        method: formMode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeid: parsedEmployeeId,
          name: trimmedName,
          role: form.role,
          email: form.email.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save employee');
      }

      setActionMessage(
        formMode === 'add'
          ? `Employee ${trimmedName} was added successfully.`
          : `Employee ${trimmedName} was updated successfully.`
      );
      closeForm();
      await fetchEmployees(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save employee';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    resetMessages();

    try {
      const res = await fetch('/api/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeid: deleteTarget.employeeid }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete employee');
      }

      setActionMessage(`Employee ${deleteTarget.name} was deleted successfully.`);
      setDeleteTarget(null);
      await fetchEmployees(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete employee';
      setActionError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">{employeeName || 'Manager'}</h1>
      </header>
      <div className="p-6 space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Employee Management</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void fetchEmployees()}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-800"
          >
            Add Employee
          </button>
        </div>
      </section>

      {actionMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </p>
      )}
      {actionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Employees', value: employees.length, accent: 'border-teal-400' },
          { label: 'Managers', value: managerCount, accent: 'border-blue-400' },
          { label: 'Cashiers', value: cashierCount, accent: 'border-amber-400' },
        ].map(card => (
          <div
            key={card.label}
            className={`rounded-xl border-2 ${card.accent} bg-white p-4 shadow-sm`}
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">Employees</h3>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Loading employees...</p>
        ) : loadError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              onClick={() => void fetchEmployees()}
              className="mt-3 px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        ) : employees.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No employees found. Add your first employee to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">ID</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Cashier PIN</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {employees.map(employee => (
                  <tr key={employee.employeeid} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">{employee.employeeid}</td>
                    <td className="px-5 py-4 text-gray-700">{employee.name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          employee.role
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {roleLabel(employee.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{employee.email || '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{employee.employeeid}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(employee)}
                          className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            resetMessages();
                            setDeleteTarget(employee);
                          }}
                          className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              {formMode === 'add' ? 'Add Employee' : 'Edit Employee'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {formMode === 'add'
                ? 'Create a new employee record and choose whether they are a cashier or manager.'
                : 'Update the employee name or role. Employee ID stays the same so login access remains stable.'}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="number"
                  min={1}
                  value={form.employeeid}
                  disabled={formMode === 'edit'}
                  onChange={event => setForm(current => ({ ...current, employeeid: event.target.value }))}
                  className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  placeholder="Employee name"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={event =>
                    setForm(current => ({ ...current, role: event.target.value as EmployeeRole }))
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                  placeholder="employee@example.com"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : formMode === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Delete Employee</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> (ID{' '}
              {deleteTarget.employeeid})?
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Employees with existing order history cannot be deleted, and the system must keep at least one
              employee record.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
