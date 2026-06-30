import React, { useEffect, useState } from 'react';
import { Search, Calendar, CheckCircle, XCircle, Clock, Save, ChevronRight, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setBaseUrl } from '../../services/HttpService';
import { BASE_URL } from '../../common/Constant';
import { MobileAdminNav } from '../../components/layout/mobile-admin-nav';
import { AdminPageHeader } from '../../components/layout/page-header';
import { getUserListForACoach, setCoachingPlan } from '../../services/AdminServices';
import { getLoggedUserDetails, getCoachingHistory } from '../../services/ProfileService';
import { IUser, ICoachingPlan } from '../../interface/models/User';
import toast from 'react-hot-toast';
import moment from 'moment';

interface PlanForm {
    PlanName: string;
    Price: string;
    StartDate: string;
    EndDate: string;
}

const EMPTY_FORM: PlanForm = { PlanName: '', Price: '', StartDate: '', EndDate: '' };

export default function PricingPlanManagementScreen() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
    const [form, setForm] = useState<PlanForm>(EMPTY_FORM);

    useEffect(() => { setBaseUrl(BASE_URL); }, []);

    // All clients for this coach
    const { data: clients = [], isLoading } = useQuery<IUser[]>({
        queryKey: ['coach-clients-plans'],
        queryFn: async () => {
            const res = await getUserListForACoach({});
            return res.data?.data ?? [];
        },
    });

    // Coaching history for selected user
    const { data: history = [] } = useQuery<ICoachingPlan[]>({
        queryKey: ['coaching-history', selectedUser?.IdUser],
        queryFn: async () => {
            const res = await getCoachingHistory({ IdUser: selectedUser!.IdUser! });
            return res.data?.data ?? [];
        },
        enabled: !!selectedUser?.IdUser,
    });

    // Profile of selected user (to pre-fill current plan)
    const { data: selectedProfile } = useQuery({
        queryKey: ['client-profile-plan', selectedUser?.IdUser],
        queryFn: async () => {
            const res = await getLoggedUserDetails({ IdUser: selectedUser!.IdUser });
            return (res.data?.data as any)?.[0] ?? null;
        },
        enabled: !!selectedUser?.IdUser,
    });

    // Pre-fill form when profile loads
    useEffect(() => {
        if (!selectedProfile) return;
        setForm({
            PlanName: selectedProfile.PlanName ?? '',
            Price: selectedProfile.Price != null ? String(selectedProfile.Price) : '',
            StartDate: selectedProfile.StartDate ? moment(selectedProfile.StartDate).format('YYYY-MM-DD') : '',
            EndDate: selectedProfile.EndDate ? moment(selectedProfile.EndDate).format('YYYY-MM-DD') : '',
        });
    }, [selectedProfile]);

    const { mutate: save, isPending: saving } = useMutation({
        mutationFn: (data: Parameters<typeof setCoachingPlan>[0]) => setCoachingPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coach-clients-plans'] });
            queryClient.invalidateQueries({ queryKey: ['client-profile-plan', selectedUser?.IdUser] });
            queryClient.invalidateQueries({ queryKey: ['coaching-history', selectedUser?.IdUser] });
            toast.success('Coaching plan saved!');
            setSelectedUser(null);
            setForm(EMPTY_FORM);
        },
        onError: () => toast.error('Failed to save plan'),
    });

    const handleSave = () => {
        if (!form.PlanName.trim() || !form.StartDate || !form.EndDate) {
            toast.error('Fill in all fields');
            return;
        }
        save({
            IdUser: selectedUser!.IdUser!,
            PlanName: form.PlanName.trim(),
            Price: parseFloat(form.Price) || 0,
            StartDate: form.StartDate,
            EndDate: form.EndDate,
            PaidAmount: parseFloat(form.Price) || 0,
        });
    };

    const filtered = clients.filter(c =>
        `${c.FirstName} ${c.LastName} ${c.EmailID}`.toLowerCase().includes(search.toLowerCase())
    );

    const statusInfo = (c: IUser) => {
        if (!c.EndDate) return { label: 'No plan', color: 'text-gray-400', bg: 'bg-gray-50', icon: <Clock size={12} /> };
        const days = moment(c.EndDate).diff(moment().startOf('day'), 'days');
        if (days < 0) return { label: 'Expired', color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={12} /> };
        if (days <= 10) return { label: `${days}d left`, color: 'text-amber-600', bg: 'bg-amber-50', icon: <AlertTriangle size={12} /> };
        return { label: `${days}d left`, color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle size={12} /> };
    };

    // ── Slide-up form panel ───────────────────────────────────────────────────
    if (selectedUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AdminPageHeader
                    title="Set Coaching Plan"
                    subtitle={`${selectedUser.FirstName} ${selectedUser.LastName}`}
                    onBack={() => { setSelectedUser(null); setForm(EMPTY_FORM); }}
                />

                <div className="p-4 space-y-4">
                    {/* Current plan summary */}
                    {selectedProfile?.PlanName && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs text-gray-500 mb-1">Current plan</p>
                            <p className="font-semibold text-gray-800">{selectedProfile.PlanName}</p>
                            <p className="text-sm text-gray-500">
                                {selectedProfile.StartDate ? moment(selectedProfile.StartDate).format('DD MMM YYYY') : '—'}
                                {' → '}
                                {selectedProfile.EndDate ? moment(selectedProfile.EndDate).format('DD MMM YYYY') : '—'}
                                {selectedProfile.Price != null ? ` · €${selectedProfile.Price}` : ''}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                        <p className="text-sm font-semibold text-gray-800">
                            {selectedProfile?.PlanName ? 'Update / New Period' : 'Add Coaching Plan'}
                        </p>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name</label>
                            <input
                                type="text"
                                placeholder="e.g. 3-Month Transformation"
                                value={form.PlanName}
                                onChange={e => setForm(f => ({ ...f, PlanName: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (€)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={form.Price}
                                onChange={e => setForm(f => ({ ...f, Price: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={form.StartDate}
                                    onChange={e => setForm(f => ({ ...f, StartDate: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={form.EndDate}
                                    onChange={e => setForm(f => ({ ...f, EndDate: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Duration preview */}
                        {form.StartDate && form.EndDate && moment(form.EndDate).isAfter(form.StartDate) && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                                <Calendar size={14} />
                                {moment(form.EndDate).diff(moment(form.StartDate), 'days')} days coaching period
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
                        >
                            <Save size={15} />
                            {saving ? 'Saving…' : 'Save Plan'}
                        </button>
                    </div>

                    {/* Payment History */}
                    {history.length > 0 && (
                        <div className="space-y-2 pb-8">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Payment History</p>
                            {history.map((record, idx) => {
                                const days = record.EndDate
                                    ? moment(record.EndDate).diff(moment().startOf('day'), 'days')
                                    : null;
                                const isActive = days !== null && days >= 0;
                                return (
                                    <div key={record.IdPlan ?? idx} className={`bg-white rounded-xl border shadow-sm p-4 ${isActive ? 'border-green-200' : 'border-gray-100'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold text-gray-800 text-sm">{record.PlanName}</p>
                                            {isActive ? (
                                                <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 text-xs font-semibold rounded-full">
                                                    <CheckCircle size={11} /> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 text-xs font-semibold rounded-full">
                                                    <XCircle size={11} /> Expired
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>€{record.Price ?? 0}</span>
                                            <span>{record.StartDate ? moment(record.StartDate).format('DD MMM YY') : '—'} → {record.EndDate ? moment(record.EndDate).format('DD MMM YY') : '—'}</span>
                                            {isActive && days !== null && <span className="text-blue-600 font-medium">{days}d left</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Client list ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <AdminPageHeader title="Coaching Plans" subtitle="Manage client plans" />

            <div className="p-4 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search clients…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-400 text-sm">Loading clients…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
                ) : (
                    filtered.map(client => {
                        const status = statusInfo(client);
                        return (
                            <button
                                key={client.IdUser}
                                onClick={() => { setSelectedUser(client); setForm(EMPTY_FORM); }}
                                className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm font-bold">
                                        {(client.FirstName?.[0] ?? '') + (client.LastName?.[0] ?? '')}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                        {client.FirstName} {client.LastName}
                                    </p>
                                    {client.PlanName ? (
                                        <p className="text-xs text-gray-500 truncate">{client.PlanName} · {client.EndDate ? moment(client.EndDate).format('DD MMM YYYY') : '—'}</p>
                                    ) : (
                                        <p className="text-xs text-gray-400">No plan set</p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} flex-shrink-0`}>
                                    {status.icon}
                                    {status.label}
                                </div>

                                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                            </button>
                        );
                    })
                )}
            </div>

            <MobileAdminNav />
        </div>
    );
}
