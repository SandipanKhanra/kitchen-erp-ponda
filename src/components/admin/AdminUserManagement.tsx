import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Search } from 'lucide-react';
import { Pagination } from '../common/Pagination';

export const AdminUserManagement: React.FC = () => {
  const { currentCenter, centerUsers, currentUser, assignUserRole, raiseCenterRequest } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [centerCode, setCenterCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [requestSent, setRequestSent] = useState(false);

  const filteredUsers = centerUsers.filter(
    (u) =>
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleRaiseRequest = async () => {
    if (!centerName || !centerCode || !city) {
      alert('Please fill in Center Name, Center Code, and City.');
      return;
    }

    await raiseCenterRequest({
      name: centerName,
      code: centerCode,
      city,
      state,
      country,
    });

    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setIsRequestModalOpen(false);
      setCenterName('');
      setCenterCode('');
      setCity('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-black px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-900">
              CENTER ADMINISTRATION
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {currentCenter.name} &bull; Devotee Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Features c & d: Manage user roles strictly inside your center and raise center addition requests for Super Admin approval.
          </p>
        </div>

        {/* Feature c: Admin can only raise request to add a new center */}
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-orange-500/20 text-xs transition-all"
        >
          <Building2 className="w-4 h-4" />
          <span>Request New Center (SAdmin Approval)</span>
        </button>
      </div>

      {/* Feature d: Admin can only assign new admin from the existing users of a center */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Registered Devotees in {currentCenter.name}
            </h3>
            <span className="text-xs text-slate-400">
              Rule: Admins can promote existing devotees to Admin or remove Admin role.
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by devotee name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/60 pb-1">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3.5">Devotee Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Center Status</th>
                <th className="px-6 py-3.5 text-right">Assign Admin Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No devotees found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isSelf = u.uid === currentUser.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-normal">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        Isolated to {currentCenter.code}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {u.role === 'admin' ? (
                          <button
                            onClick={() => assignUserRole(u.uid, 'user')}
                            disabled={isSelf}
                            className="text-rose-600 dark:text-rose-400 hover:underline font-bold disabled:opacity-40"
                            title={isSelf ? 'Cannot demote yourself' : 'Remove Admin role'}
                          >
                            Demote to User
                          </button>
                        ) : (
                          <button
                            onClick={() => assignUserRole(u.uid, 'admin')}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                          >
                            Promote to Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[4, 6, 12]}
        />
      </div>

      {/* Modal: Raise Center Addition Request (Feature c) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Request New Center Addition
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              As an Admin, your request will be forwarded to the <strong>Super Admin</strong>. Once approved, the center will be created and open for user registration.
            </p>

            {requestSent ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-center font-bold text-xs">
                Request successfully submitted to SAdmin!
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Center Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ISKCON Bangalore Center"
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Unique Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ISKCON-BLR"
                    value={centerCode}
                    onChange={(e) => setCenterCode(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full mt-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full mt-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRaiseRequest}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20"
                  >
                    Submit Request to SAdmin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
