import React, { useEffect, useState } from 'react';
import { Plus, Upload, X, Check, Edit, Trash2, EuroIcon, Calendar, Search, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setBaseUrl } from '../../services/HttpService';
import { BASE_URL } from '../../common/Constant';
import { MobileAdminNav } from '../../components/layout/mobile-admin-nav';
import { deletePricingPlans, getAllPricingPlans, getAllSubscriptionAssigned, insertPricingPlans, removeSubscriptionFromUser, setSubscriptionToUser } from '../../services/AdminServices';
import { ISubscriptionHistory, IUser } from '../../interface/models/User';
import toast from 'react-hot-toast';



export default function PricingPlanManagementScreen() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showSubscriptionAssignment, setShowSubscriptionAssignment] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<ISubscriptionHistory | null>(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    const queryClient = useQueryClient();

    // Form state
    const [formData, setFormData] = useState<ISubscriptionHistory>({
        PlanName: '',
        PlanDescription: '',
        Price: 0,
        IsActive: 1,
        BillingCycle: 'Monthly'
    });

    /**
     * Set up base url
     */
    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);

    // Fetch pricing plans
    const { data: pricingPlans } = useQuery({
        queryKey: ["pricing-plans-all"],
        queryFn: async (): Promise<ISubscriptionHistory[]> => {
            const response = await getAllPricingPlans(null);
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data.data;
        }
    });



    // Fetch assigned subscriptions for the selected plan
    const { data: assignedSubscriptions } = useQuery({
        queryKey: ["assigned-subscriptions", selectedPlan?.IdPricingPlan],
        queryFn: async (): Promise<IUser[]> => {
            if (!selectedPlan?.IdPricingPlan) return [];
            const response = await getAllSubscriptionAssigned({ IdPricingPlan: selectedPlan.IdPricingPlan });
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data.data;
        },
        enabled: !!selectedPlan?.IdPricingPlan && showSubscriptionAssignment
    });

    // Add mutation
    const { mutate: savePricingPlan } = useMutation({
        mutationFn: async (planData: ISubscriptionHistory) => {
            if (planData.IdPricingPlan) {
                // await updatePricingPlan(planData);
                return
            } else {

                await insertPricingPlans(planData);
                return
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing-plans-all'] });
            resetForm();
            setShowAddForm(false);
            setShowEditForm(false);

        },
        onError: (error) => {
            console.error('Error saving pricing plan:', error);
            alert('Failed to save pricing plan');
        }
    });

    //delte pricing plans
    const { mutate: deletePricingPlan } = useMutation({
        mutationFn: async (planData: ISubscriptionHistory) => {
            if (planData.IdPricingPlan) {
                return await deletePricingPlans(planData);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing-plans-all'] });
            resetForm();
            setShowAddForm(false);
            setShowEditForm(false);

        },
        onError: (error) => {
            console.error('Error saving pricing plan:', error);
            alert('Failed to save pricing plan');
        }
    });


    // Assign subscription mutation
    const { mutate: assignUserSubscription } = useMutation({
        mutationFn: setSubscriptionToUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assigned-subscriptions"] });
            toast.success("Subscriptions Assigned Successful", {
                position: "bottom-center"
            });
        },
        onError: (error) => {
            console.error('Error assigning subscription:', error);
            toast.error('Failed to assign subscription', {
                position: "bottom-center"
            });
        }
    });

    // Remove subscription mutation
    const { mutate: removeUserSubscription } = useMutation({
        mutationFn: removeSubscriptionFromUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assigned-subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["users-all"] });
            toast.success("Subscription removed successfully!", {
                position: "bottom-center"
            });
        },
        onError: (error) => {
            console.error('Error removing subscription:', error);

            toast.error('Failed to remove subscription!', {
                position: "bottom-center"
            });
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        savePricingPlan(formData);
    };

    const startEdit = (plan: ISubscriptionHistory) => {
        setSelectedPlan(plan);
        setFormData(plan);
        setShowEditForm(true);
    };

    const handleDelete = (plan: ISubscriptionHistory) => {
        console.log(plan);
        deletePricingPlan(plan);

    };

    const startSubscriptionAssignment = (plan: ISubscriptionHistory) => {
        setSelectedPlan(plan);
        setShowSubscriptionAssignment(true);
        setUserSearchTerm('');
    };

    const handleAssignSubscription = (userId: number | undefined) => {
        if (!selectedPlan?.IdPricingPlan) return;
        console.log(userId);
        const data = {
            IdUser: userId,
            IdPricingPlan: selectedPlan.IdPricingPlan
        }
        assignUserSubscription(data);
    };

    const handleRemoveSubscription = (userId: number) => {
        if (!selectedPlan?.IdPricingPlan) return;
        const data = {
            IdUser: userId,
            IdPricingPlan: selectedPlan.IdPricingPlan
        }
        removeUserSubscription(data);
    };

    const resetForm = () => {
        setFormData({
            PlanName: '',
            PlanDescription: '',
            Price: 0,
            IsActive: 1,
            BillingCycle: 'Monthly'
        });
        setSelectedPlan(null);
    };

    // Format price display
    const formatPrice = (price: number, cycle: string) => {
        if (price && cycle)
            return `€${price}/${cycle === 'Yearly' ? 'yr' : 'mo'}`;
        else
            return '€0000'
    };


    // Subscription Assignment Modal
    if (showSubscriptionAssignment && selectedPlan && Array.isArray(assignedSubscriptions)) {
        return (
            <div className="p-4 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Assign Subscriptions to {selectedPlan.PlanName}</h1>
                    <button
                        onClick={() => {
                            setShowSubscriptionAssignment(false);
                            setUserSearchTerm('');
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">Select users to assign this subscription plan:</p>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {assignedSubscriptions?.map((user) => (
                        <div key={user.IdUser} className="bg-white rounded-lg border p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">{user.FirstName}</h3>
                                <p className="text-sm text-gray-600">{user.EmailID}</p>
                            </div>
                            {(user.IdSub) ? (
                                <button
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    onClick={() => { handleRemoveSubscription(user.IdUser!) }}
                                >
                                    Remove
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleAssignSubscription(user.IdUser);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Assign
                                </button>
                            )}
                        </div>
                    ))}

                </div>
            </div>
        );
    }

    // Rest of your existing code for forms and pricing plans list...
    // Form Component
    if (showAddForm || showEditForm) {
        return (
            <div className="p-4 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">
                        {showEditForm ? 'Edit Pricing Plan' : 'Add New Pricing Plan'}
                    </h1>
                    <button
                        onClick={() => {
                            setShowAddForm(false);
                            setShowEditForm(false);
                            resetForm();
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Plan Name */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Plan Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plan Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.PlanName}
                                    onChange={(e) => setFormData((prev: ISubscriptionHistory) => ({
                                        ...prev,
                                        PlanName: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Basic, Pro, Enterprise"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plan Description *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.PlanDescription}
                                    onChange={(e) => setFormData((prev: ISubscriptionHistory) => ({
                                        ...prev,
                                        PlanDescription: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Describe what this plan includes..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Billing */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Pricing & Billing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price *
                                </label>
                                <div className="relative">
                                    <EuroIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.Price}
                                        onChange={(e) => setFormData((prev: ISubscriptionHistory) => ({
                                            ...prev,
                                            Price: parseFloat(e.target.value) || 0
                                        }))}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Billing Cycle *
                                </label>
                                <select
                                    required
                                    value={formData.BillingCycle}
                                    onChange={(e) => setFormData((prev: ISubscriptionHistory) => ({
                                        ...prev,
                                        BillingCycle: e.target.value as 'Monthly' | 'Yearly'
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </div>
                        </div>

                        {/* Price Preview */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Price Preview:</p>
                            <p className="text-lg font-semibold text-gray-800">

                                {formatPrice(formData.Price!, formData.BillingCycle!)}
                            </p>
                            {formData.BillingCycle === 'Yearly' && (
                                <p className="text-sm text-gray-500">
                                    €{(formData.Price! / 12).toFixed(2)}/month equivalent
                                </p>
                            )}
                        </div>
                    </div>


                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                setShowEditForm(false);
                                resetForm();
                            }}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            {showEditForm ? 'Update Plan' : 'Add Plan'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="p-4 pb-20">
            <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
            </header>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 mt-14">
                <h1 className="text-xl font-bold">Pricing Plans</h1>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Plan
                </button>
            </div>

            {/* Pricing Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pricingPlans?.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <EuroIcon size={48} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No pricing plans added yet</h3>
                        <p className="text-gray-500 mb-4">Start by creating your first pricing plan</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Create First Plan
                        </button>
                    </div>
                ) : (
                    pricingPlans?.map((plan) => (
                        <div
                            key={plan.IdPricingPlan}
                            className={`bg-white rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg ${plan.IsActive ? 'border-green-200' : 'border-gray-200'
                                }`}
                        >
                            {/* Status Badge */}
                            <div className={`px-4 py-2 text-xs font-medium ${plan.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {plan.IsActive ? 'Active' : 'Inactive'}
                            </div>

                            {/* Plan Content */}
                            <div className="p-6">
                                {/* Plan Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">{plan.PlanName}</h3>
                                        <p className="text-3xl font-bold text-blue-600 mt-2">
                                            {formatPrice(plan.Price!, plan.BillingCycle!)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 mr-4">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span className="text-sm text-gray-500">{plan.BillingCycle}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => startEdit(plan)}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan)}
                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Plan Description */}
                                <p className="text-gray-600 mb-6 line-clamp-3">{plan.PlanDescription}</p>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startSubscriptionAssignment(plan)}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                                    >
                                        Assign Subscription
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation */}
            <MobileAdminNav />
        </div>
    );
}