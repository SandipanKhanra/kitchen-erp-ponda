import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CheckCircle2, XCircle, Search, PauseCircle, PlayCircle, Trash2, BarChart3 } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { formatDateDDMMYYYY, formatUserRole } from '../../utils/formatters';
import { SAdminCenterAnalytics } from './SAdminCenterAnalytics';

export const SAdminDashboard: React.FC = () => {
  const {
    allCenters,
    availableCenters,
    centerRequests,
    allUsers,
    approveCenterRequest,
    rejectCenterRequest,
    assignUserRole,
    toggleCenterStatus,
    deleteCenter,
  } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'requests' | 'centers' | 'users'>('analytics');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [centersPage, setCentersPage] = useState(1);
  const [centersPageSize, setCentersPageSize] = useState(6);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(8);

  const pendingRequests = centerRequests.filter((r) => r.status === 'pending_approval');

  // Filtered & Paginated Centers (allCenters for super admin management)
  const filteredCenters = allCenters.filter(
    (c) =>
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedCenters = filteredCenters.slice(
    (centersPage - 1) * centersPageSize,
    centersPage * centersPageSize
  );

  // Filtered & Paginated Users
  const filteredUsers = allUsers.filter(
    (u) =>
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.centerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * usersPageSize,
    usersPage * usersPageSize
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-xs font-black px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-900">
              SUPER ADMIN CONSOLE
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Global Center Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Features c, e & 1: Review center creation requests, supervise isolated centers, and manage cross-center administrators.
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => {
              setActiveSubTab('analytics');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'analytics'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
            <span>Center-Wise Report</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('requests');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'requests'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('centers');
              setSearchQuery('');
              setCentersPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'centers'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Centers ({allCenters.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('users');
              setSearchQuery('');
              setUsersPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'users'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Devotees ({allUsers.length})
          </button>
        </div>
      </div>

      {/* Subtab 0: Center-Wise Analytics & Financial Report */}
      {activeSubTab === 'analytics' && <SAdminCenterAnalytics />}

      {/* Subtab 1: Pending Center Addition Requests (Feature c) */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                All Center Requests Cleared
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                There are no pending center addition requests awaiting Super Admin approval.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                        PENDING APPROVAL
                      </span>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{req.name}</h3>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Code: <strong className="text-slate-700 dark:text-slate-300">{req.code}</strong> &bull; Location:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {req.city}, {req.state}, {req.country}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => approveCenterRequest(req.id)}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Create Center</span>
                    </button>
                    <button
                      onClick={() => setRejectingId(req.id)}
                      className="flex items-center space-x-1.5 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-4 py-2 rounded-xl font-bold transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs flex flex-col sm:flex-row justify-between gap-1 text-slate-500 dark:text-slate-400">
                  <div>
                    Requested by Admin: <strong>{req.requestedByAdminName}</strong> ({req.requestedByAdminEmail})
                  </div>
                  <div>
                    Date: {formatDateDDMMYYYY(req.requestedAt)}
                  </div>
                </div>

                {rejectingId === req.id && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2 text-xs">
                    <label className="font-bold text-rose-900 dark:text-rose-300">Reason for Rejection:</label>
                    <input
                      type="text"
                      placeholder="e.g. Duplicate center code or invalid credentials"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full p-2 border border-rose-300 rounded-lg dark:bg-slate-800 dark:text-white"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          rejectCenterRequest(req.id, rejectReason);
                          setRejectingId(null);
                        }}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab 2: Centers Management (Active & Inactive with Deactivate & Delete controls) */}
      {activeSubTab === 'centers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredCenters.length} centers ({allCenters.filter((c) => c.status === 'active').length} active)
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search center name or city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCentersPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCenters.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No centers found matching your search.
              </div>
            ) : (
              paginatedCenters.map((center) => (
                <div
                  key={center.id}
                  className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm space-y-3 transition-all ${
                    center.status === 'active'
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-300 dark:border-slate-700/60 opacity-80 bg-slate-50/50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900">
                        {center.code}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{center.name}</h3>
                    </div>
                    {center.status === 'active' ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900 flex items-center space-x-1 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center space-x-1 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>Inactive</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    City: <strong>{center.city}, {center.state}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Registered Users:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{center.userCount || 1} devotees</span>
                  </div>

                  {/* Super Admin Center Actions: Deactivate / Activate and Delete */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleCenterStatus(center.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        center.status === 'active'
                          ? 'border-amber-300 dark:border-amber-800/80 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                      title={center.status === 'active' ? 'Deactivate this center' : 'Activate this center'}
                    >
                      {center.status === 'active' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to permanently delete "${center.name}" (${center.code})? This action cannot be undone.`
                          )
                        ) {
                          deleteCenter(center.id);
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition"
                      title="Permanently delete center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={centersPage}
            totalItems={filteredCenters.length}
            pageSize={centersPageSize}
            onPageChange={setCentersPage}
            onPageSizeChange={(size) => {
              setCentersPageSize(size);
              setCentersPage(1);
            }}
            pageSizeOptions={[3, 6, 12]}
          />
        </div>
      )}

      {/* Subtab 3: Global Users Directory (Feature 1) */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredUsers.length} devotees
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search devotee name or center..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUsersPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto pb-1">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Assigned Center</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                        No devotees found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">{u.centerName}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              u.role === 'sadmin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : u.role === 'admin'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {formatUserRole(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          {u.role === 'sadmin' ? (
                            <span className="text-slate-400 font-bold text-xs" title="Super Admin role cannot be modified">
                              —
                            </span>
                          ) : (
                            <>
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => assignUserRole(u.uid, 'admin')}
                                  className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                                >
                                  Make Admin
                                </button>
                              )}
                              {u.role === 'admin' && (
                                <button
                                  onClick={() => assignUserRole(u.uid, 'user')}
                                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium"
                                >
                                  Demote
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={usersPage}
            totalItems={filteredUsers.length}
            pageSize={usersPageSize}
            onPageChange={setUsersPage}
            onPageSizeChange={(size) => {
              setUsersPageSize(size);
              setUsersPage(1);
            }}
            pageSizeOptions={[4, 8, 16]}
          />
        </div>
      )}
    </div>
  );
};
