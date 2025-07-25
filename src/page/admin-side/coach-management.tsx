import React, { useEffect, useState } from 'react';
import { Plus, Upload, X, Camera, User, FileText, Award, Tag, Users, Phone, MessageCircle, Instagram, Facebook, Twitter, Linkedin, Youtube, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setBaseUrl } from '../../services/HttpService';
import { BASE_URL } from '../../common/Constant';
import { addCoach, getAllCoach, setCoachAssign } from '../../services/AdminServices';
import { Certification, CoachStudentAssign, ICoach } from '../../interface/models/Coach';
import { MobileAdminNav } from '../../components/layout/mobile-admin-nav';
import { IUser } from '@/interface/models/User';
import { getAlreadyAssignedList, getLoggedUserDetails } from '@/services/ProfileService';



export default function CoachManagementScreen() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showCoachDetail, setShowCoachDetail] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<ICoach | null>(null);
    const [showClientAssignment, setShowClientAssignment] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    // Initialize query client
    const queryClient = useQueryClient();

    // Form state
    const [formData, setFormData] = useState<Omit<ICoach, 'IdUser'>>({
        CoachName: '',
        BasicDetails: {
            phone: '',
            banner_image: '',
            profile_picture: '',
            subject: '',
            social_media: []
        },
        ProfessionalDetails: {
            certifications: [],
            specializations: [],
            about: '',
            timing: ''
        }
    });

    const [newSpecialization, setNewSpecialization] = useState('');
    const [profileImagePreview, setProfileImagePreview] = useState<string>('');
    const [bannerImagePreview, setBannerImagePreview] = useState<string>('');
    const [certificateFiles, setCertificateFiles] = useState<File[]>([]);

    /**
    * author : basil1112
    * set up base url
     */
    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);


    // Fetch user's list 
    const { data: coaches } = useQuery({
        queryKey: ["coach-all-list"],
        queryFn: async (): Promise<ICoach[]> => {
            const response = await getAllCoach(null);
            if (!response.data) {
                throw new Error('No data received');
            }
            return response.data.data;
        }
    });

    //get all studnets
    const { data: clientDetails } = useQuery<IUser[] | undefined>({
        queryKey: ["get_mydetails"],
        queryFn: async () => {
            try {
                const res = await getLoggedUserDetails(0) as ApiResponse<Partial<IUser[]>>;
                if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                    return res.data.data as IUser[];
                }
                return undefined;
            } catch (error) {
                console.log("error handling", error);
                return undefined;
            }
        }
    });

    //get all studnets
    const { data: alreadyAssigned } = useQuery<CoachStudentAssign[] | undefined>({
        queryKey: ["get_alreadyAssigned"],
        queryFn: async () => {
            try {
                const res = await getAlreadyAssignedList(0);
                if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                    return res.data.data;
                }
                return undefined;
            } catch (error) {
                console.log("error handling", error);
                return undefined;
            }
        }
    });


    // Define the mutation
    const { mutate: saveCoach } = useMutation({
        mutationFn: async (coachData: FormData) => {
            const response = await addCoach(coachData)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
            resetForm();
            setShowAddForm(false);
            setShowEditForm(false);
            alert('Coach saved successfully!');
        },
        onError: (error) => {
            console.error('Error saving coach:', error);
            alert('Failed to save coach');
        }
    });


    // Define the mutation for coach assign
    const { mutate: assignCoachToStudent } = useMutation({
        mutationFn: setCoachAssign,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["get_mydetails"] });
            queryClient.invalidateQueries({ queryKey: ["get_alreadyAssigned"] });

        },
        onError: (error) => {
            console.error("Error", error);

        }
    });



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Create FormData object for the HTTP request
            const requestFormData = new FormData();

            // Append simple fields from our form state
            requestFormData.append('IdCoach', selectedCoach?.IdCoach?.toString() || '');
            requestFormData.append('CoachName', formData.CoachName); // Using formState instead of formData

            // Append JSON fields as strings
            requestFormData.append('basic_details', JSON.stringify({
                phone: formData.BasicDetails.phone,
                banner_image: bannerImagePreview.includes('http') ? bannerImagePreview : '',
                profile_picture: profileImagePreview.includes('http') ? profileImagePreview : '',
                subject: formData.BasicDetails.subject,
                social_media: formData.BasicDetails.social_media
            }));

            requestFormData.append('professional_details', JSON.stringify({
                certifications: formData.ProfessionalDetails.certifications,
                specializations: formData.ProfessionalDetails.specializations,
                about: formData.ProfessionalDetails.about,
                timing: formData.ProfessionalDetails.timing
            }));

            // Append files if they're new uploads
            if (profileImagePreview && !profileImagePreview.includes('http')) {
                const blob = await fetch(profileImagePreview).then(r => r.blob());
                requestFormData.append('profile_image', blob, 'profile.jpg');
            }

            if (bannerImagePreview && !bannerImagePreview.includes('http')) {
                const blob = await fetch(bannerImagePreview).then(r => r.blob());
                requestFormData.append('banner_image', blob, 'banner.jpg');
            }

            // Append certificate files
            certificateFiles.forEach((file, index) => {
                requestFormData.append(`certificates`, file);
            });

            // Call the mutation with the properly named FormData object
            saveCoach(requestFormData);
        } catch (error) {
            console.error('Error preparing form data:', error);
            alert('Error preparing form data. Please try again.');
        }
    };
    // Start editing a coach
    const startEdit = (coach: ICoach) => {
        setSelectedCoach(coach);
        setFormData({
            CoachName: coach.CoachName,
            BasicDetails: {
                phone: coach.BasicDetails.phone,
                banner_image: coach.BasicDetails.banner_image,
                profile_picture: coach.BasicDetails.profile_picture,
                subject: coach.BasicDetails.subject,
                social_media: [...coach.BasicDetails.social_media]
            },
            ProfessionalDetails: {
                certifications: [...coach.ProfessionalDetails.certifications],
                specializations: [...coach.ProfessionalDetails.specializations],
                about: coach.ProfessionalDetails.about,
                timing: coach.ProfessionalDetails.timing
            }
        });
        setProfileImagePreview(coach.BasicDetails.profile_picture);
        setBannerImagePreview(coach.BasicDetails.banner_image);
        setShowEditForm(true);
    };

    // View coach details
    const viewCoachDetail = (coach: ICoach) => {
        setSelectedCoach(coach);
        setShowCoachDetail(true);
    };

    const resetForm = () => {
        setFormData({
            CoachName: '',
            BasicDetails: {
                phone: '',
                banner_image: '',
                profile_picture: '',
                subject: '',
                social_media: []
            },
            ProfessionalDetails: {
                certifications: [],
                specializations: [],
                about: '',
                timing: ''
            }
        });
        setNewSpecialization('');
        setProfileImagePreview('');
        setBannerImagePreview('');
        setCertificateFiles([]);
        setSelectedCoach(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const previewUrl = reader.result as string;
                if (type === 'profile') {
                    setProfileImagePreview(previewUrl);
                } else {
                    setBannerImagePreview(previewUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCertificationFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const newFiles = [...certificateFiles];
            newFiles[index] = file;
            setCertificateFiles(newFiles);

            const reader = new FileReader();
            reader.onload = () => {
                const updatedCertifications = [...formData.ProfessionalDetails.certifications];
                if (!updatedCertifications[index]) {
                    updatedCertifications[index] = { name: '', centre: '', file_url: '' };
                }
                setFormData(prev => ({
                    ...prev,
                    professional_details: {
                        ...prev.ProfessionalDetails,
                        certifications: updatedCertifications
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCoachStudentAssign = (coachId: number | undefined, studentId: number | undefined) => {
        if (coachId === undefined || studentId === undefined) {
            alert("Both coach and student IDs are required");
            return;
        }
        assignCoachToStudent({ coachId, studentId });
    }

    // Add specialization
    const addSpecialization = () => {
        if (newSpecialization.trim() && !formData.ProfessionalDetails.specializations.includes(newSpecialization.trim())) {
            setFormData(prev => ({
                ...prev,
                professional_details: {
                    ...prev.ProfessionalDetails,
                    specializations: [...prev.ProfessionalDetails.specializations, newSpecialization.trim()]
                }
            }));
            setNewSpecialization('');
        }
    };

    // Remove specialization
    const removeSpecialization = (index: number) => {
        setFormData(prev => ({
            ...prev,
            professional_details: {
                ...prev.ProfessionalDetails,
                specializations: prev.ProfessionalDetails.specializations.filter((_, i) => i !== index)
            }
        }));
    };

    // Add certification
    const addCertification = () => {
        setFormData(prev => ({
            ...prev,
            professional_details: {
                ...prev.ProfessionalDetails,
                certifications: [...prev.ProfessionalDetails.certifications, { name: '', centre: '', file_url: '' }]
            }
        }));
    };

    // Remove certification
    const removeCertification = (index: number) => {
        setFormData(prev => ({
            ...prev,
            professional_details: {
                ...prev.ProfessionalDetails,
                certifications: prev.ProfessionalDetails.certifications.filter((_, i) => i !== index)
            }
        }));

        const newFiles = [...certificateFiles];
        newFiles.splice(index, 1);
        setCertificateFiles(newFiles);
    };

    // Update certification
    const updateCertification = (index: number, field: keyof Certification, value: string) => {
        const updatedCertifications = [...formData.ProfessionalDetails.certifications];
        updatedCertifications[index] = { ...updatedCertifications[index], [field]: value };
        setFormData(prev => ({
            ...prev,
            professional_details: {
                ...prev.ProfessionalDetails,
                certifications: updatedCertifications
            }
        }));
    };

    // Add social media
    const addSocialMedia = (platform: string, url: string) => {
        setFormData(prev => ({
            ...prev,
            basic_details: {
                ...prev.BasicDetails,
                social_media: [
                    ...prev.BasicDetails.social_media.filter(sm => sm.platform !== platform),
                    { platform, url }
                ]
            }
        }));
    };

    // Remove social media
    const removeSocialMedia = (platform: string) => {
        setFormData(prev => ({
            ...prev,
            basic_details: {
                ...prev.BasicDetails,
                social_media: prev.BasicDetails.social_media.filter(sm => sm.platform !== platform)
            }
        }));
    };

    // Coach Detail View
    if (showCoachDetail && selectedCoach) {
        return (
            <div className="p-4 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Coach Details</h1>
                    <button
                        onClick={() => setShowCoachDetail(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Banner and Profile */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <div
                            className="h-32 bg-gray-200 relative"
                            style={{
                                backgroundImage: selectedCoach.BasicDetails.banner_image
                                    ? `url(${BASE_URL}/uploads/coach/banner_image/${selectedCoach.BasicDetails.banner_image})`
                                    : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            <div className="absolute -bottom-8 left-4">
                                <div
                                    className="w-16 h-16 bg-gray-300 rounded-full border-4 border-white"
                                    style={{
                                        backgroundImage: selectedCoach.BasicDetails.profile_picture
                                            ? `url(${BASE_URL}/uploads/coach/profile_image/${selectedCoach.BasicDetails.profile_picture})`
                                            : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    {!selectedCoach.BasicDetails.profile_picture && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={20} className="text-gray-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pt-10 p-4">
                            <h2 className="text-xl font-bold">{selectedCoach.CoachName}</h2>
                            <p className="text-gray-600">{selectedCoach.BasicDetails.subject}</p>
                            <p className="text-gray-500">{selectedCoach.BasicDetails.phone}</p>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Phone size={20} />
                            Contact Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 font-medium w-20">Phone:</span>
                                <span className="text-gray-700">{selectedCoach.BasicDetails.phone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Links */}
                    {selectedCoach.BasicDetails.social_media?.length > 0 && (
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4">Social Media</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedCoach.BasicDetails.social_media.map((social) => (
                                    <a
                                        key={social.platform}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-3 text-white rounded-lg hover:opacity-90 transition-opacity ${social.platform === 'Facebook' ? 'bg-blue-600' :
                                            social.platform === 'Instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                                social.platform === 'Twitter' ? 'bg-sky-500' :
                                                    social.platform === 'LinkedIn' ? 'bg-blue-700' :
                                                        social.platform === 'YouTube' ? 'bg-red-600' :
                                                            'bg-black'
                                            }`}
                                    >
                                        {social.platform === 'Facebook' && <Facebook size={20} />}
                                        {social.platform === 'Instagram' && <Instagram size={20} />}
                                        {social.platform === 'Twitter' && <Twitter size={20} />}
                                        {social.platform === 'LinkedIn' && <Linkedin size={20} />}
                                        {social.platform === 'YouTube' && <Youtube size={20} />}
                                        {!['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube'].includes(social.platform) && <User size={20} />}
                                        <span className="text-sm font-medium">{social.platform}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* About */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-3">About</h3>
                        <p className="text-gray-700">{selectedCoach.ProfessionalDetails.about}</p>
                    </div>

                    {/* Specializations */}
                    {selectedCoach.ProfessionalDetails.specializations.length > 0 && (
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Tag size={20} />
                                Specializations
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedCoach.ProfessionalDetails.specializations.map((specialty, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        {specialty}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Certifications */}
                    {selectedCoach.ProfessionalDetails.certifications.length > 0 && (
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Award size={20} />
                                Certifications
                            </h3>
                            <div className="space-y-4">
                                {selectedCoach.ProfessionalDetails.certifications.map((cert, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium">{cert.name}</h4>
                                        <p className="text-sm text-gray-600">{cert.centre}</p>
                                        {cert.file_url && (
                                            <div className="mt-2">
                                                <img
                                                    src={`${BASE_URL}${cert.file_url}`}
                                                    alt={cert.name}
                                                    className="w-full h-32 object-contain rounded-lg bg-gray-100"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => startEdit(selectedCoach)}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Edit Coach
                        </button>
                        <button
                            onClick={() => setSelectedCoach(selectedCoach)}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                            Assign Clients
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showAddForm || showEditForm) {
        return (
            <div className="p-4 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">{showEditForm ? 'Edit Coach' : 'Add New Coach'}</h1>
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
                    {/* Banner Image Upload */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Camera size={20} />
                            Banner Image
                        </h3>
                        <div className="relative">
                            <div
                                className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                                style={{
                                    backgroundImage: bannerImagePreview ? `url(${bannerImagePreview})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'banner')}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {!bannerImagePreview && (
                                    <div className="text-center">
                                        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-500">Upload banner image</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Picture Upload */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <User size={20} />
                            Profile Picture
                        </h3>
                        <div className="flex justify-center">
                            <div className="relative">
                                <div
                                    className="w-24 h-24 bg-gray-100 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden"
                                    style={{
                                        backgroundImage: profileImagePreview ? `url(${profileImagePreview})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'profile')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {!profileImagePreview && (
                                        <Camera size={20} className="text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Information */}
                    {/* Basic Information */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.CoachName}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        CoachName: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter coach's full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject Specification *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.BasicDetails.subject}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        BasicDetails: {
                                            ...prev.BasicDetails,
                                            subject: e.target.value
                                        }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Weight Loss, Strength Training, Nutrition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.BasicDetails.phone}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        BasicDetails: {
                                            ...prev.BasicDetails,
                                            phone: e.target.value
                                        }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">About</h3>
                        <textarea
                            required
                            rows={4}
                            value={formData.ProfessionalDetails.about}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                ProfessionalDetails: {
                                    ...prev.ProfessionalDetails,
                                    about: e.target.value
                                }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tell us about the coach's experience and approach..."
                        />
                    </div>

                    {/* Social Media Links */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Social Media Profiles</h3>
                        <div className="space-y-4">
                            {['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'].map((platform) => {
                                const currentLink = formData.BasicDetails.social_media.find(sm => sm.platform === platform);
                                return (
                                    <div key={platform}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            {platform === 'instagram' && <Instagram size={16} className="text-pink-500" />}
                                            {platform === 'facebook' && <Facebook size={16} className="text-blue-600" />}
                                            {platform === 'twitter' && <Twitter size={16} className="text-sky-500" />}
                                            {platform === 'linkedin' && <Linkedin size={16} className="text-blue-700" />}
                                            {platform === 'youtube' && <Youtube size={16} className="text-red-600" />}
                                            {platform === 'tiktok' && <User size={16} className="text-black" />}
                                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={currentLink?.url || ''}
                                                onChange={(e) => {
                                                    const url = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        BasicDetails: {
                                                            ...prev.BasicDetails,
                                                            social_media: url
                                                                ? [
                                                                    ...prev.BasicDetails.social_media.filter(sm => sm.platform !== platform),
                                                                    { platform, url }
                                                                ]
                                                                : prev.BasicDetails.social_media.filter(sm => sm.platform !== platform)
                                                        }
                                                    }));
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder={`https://${platform}.com/username`}
                                            />
                                            {currentLink && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            BasicDetails: {
                                                                ...prev.BasicDetails,
                                                                social_media: prev.BasicDetails.social_media.filter(sm => sm.platform !== platform)
                                                            }
                                                        }));
                                                    }}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Specializations */}
                    {/* Specializations */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Tag size={20} />
                            Specializations
                        </h3>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSpecialization}
                                    onChange={(e) => setNewSpecialization(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newSpecialization.trim() &&
                                                !formData.ProfessionalDetails.specializations.includes(newSpecialization.trim())) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    ProfessionalDetails: {
                                                        ...prev.ProfessionalDetails,
                                                        specializations: [...prev.ProfessionalDetails.specializations, newSpecialization.trim()]
                                                    }
                                                }));
                                                setNewSpecialization('');
                                            }
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add a specialization (e.g., Yoga, CrossFit, Nutrition)"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newSpecialization.trim() &&
                                            !formData.ProfessionalDetails.specializations.includes(newSpecialization.trim())) {
                                            setFormData(prev => ({
                                                ...prev,
                                                ProfessionalDetails: {
                                                    ...prev.ProfessionalDetails,
                                                    specializations: [...prev.ProfessionalDetails.specializations, newSpecialization.trim()]
                                                }
                                            }));
                                            setNewSpecialization('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>

                            {formData.ProfessionalDetails.specializations.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.ProfessionalDetails.specializations.map((specialty, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                        >
                                            {specialty}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        ProfessionalDetails: {
                                                            ...prev.ProfessionalDetails,
                                                            specializations: prev.ProfessionalDetails.specializations.filter((_, i) => i !== index)
                                                        }
                                                    }));
                                                }}
                                                className="hover:bg-blue-200 rounded-full p-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Certifications */}
                    {/* Certifications */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Award size={20} />
                                Certifications
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    // Add a new empty certification
                                    setFormData(prev => ({
                                        ...prev,
                                        ProfessionalDetails: {
                                            ...prev.ProfessionalDetails,
                                            certifications: [
                                                ...prev.ProfessionalDetails.certifications,
                                                { name: '', centre: '', file_url: '' }
                                            ]
                                        }
                                    }));
                                    // Add an empty slot for the certificate file
                                    //setCertificateFiles(prev => [...prev, null]);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 text-sm"
                            >
                                <Plus size={14} />
                                Add
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.ProfessionalDetails.certifications.map((cert, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-medium">Certification {index + 1}</h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Remove the certification
                                                setFormData(prev => ({
                                                    ...prev,
                                                    ProfessionalDetails: {
                                                        ...prev.ProfessionalDetails,
                                                        certifications: prev.ProfessionalDetails.certifications.filter((_, i) => i !== index)
                                                    }
                                                }));
                                                // Remove the corresponding file
                                                setCertificateFiles(prev => prev.filter((_, i) => i !== index));
                                            }}
                                            className="text-red-500 hover:bg-red-100 rounded-full p-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Certificate Name
                                            </label>
                                            <input
                                                type="text"
                                                value={cert.name}
                                                onChange={(e) => {
                                                    const updatedCertifications = [...formData.ProfessionalDetails.certifications];
                                                    updatedCertifications[index] = {
                                                        ...updatedCertifications[index],
                                                        name: e.target.value
                                                    };
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        ProfessionalDetails: {
                                                            ...prev.ProfessionalDetails,
                                                            certifications: updatedCertifications
                                                        }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g., Certified Personal Trainer"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Certification Centre
                                            </label>
                                            <input
                                                type="text"
                                                value={cert.centre}
                                                onChange={(e) => {
                                                    const updatedCertifications = [...formData.ProfessionalDetails.certifications];
                                                    updatedCertifications[index] = {
                                                        ...updatedCertifications[index],
                                                        centre: e.target.value
                                                    };
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        ProfessionalDetails: {
                                                            ...prev.ProfessionalDetails,
                                                            certifications: updatedCertifications
                                                        }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g., NASM, ACE, ACSM"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Certificate File
                                            </label>
                                            <div
                                                className="w-full h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative overflow-hidden"
                                                style={{
                                                    backgroundImage: cert.file_url ? `url(${cert.file_url})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => handleCertificationFileUpload(e, index)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                {!cert.file_url && (
                                                    <div className="text-center">
                                                        <FileText size={20} className="mx-auto mb-1 text-gray-400" />
                                                        <p className="text-xs text-gray-500">Upload certificate</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {formData.ProfessionalDetails.certifications.length === 0 && (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    No certifications added yet. Click "Add Certification" to get started.
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
                            {showEditForm ? 'Update Coach' : 'Add Coach'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Client Assignment Modal

    if (showClientAssignment && selectedCoach && Array.isArray(clientDetails) && Array.isArray(alreadyAssigned)) {
        return (
            <div className="p-4 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Assign Clients to {selectedCoach.CoachName}</h1>
                    <button
                        onClick={() => {
                            setShowClientAssignment(false);
                            setClientSearchTerm('');
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">Select clients to assign to this coach:</p>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search clients by name or email..."
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {clientDetails.length === 0 ? (
                        <div className="text-center py-8">
                            <Users size={48} className="mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">
                                {clientSearchTerm ? 'No matching clients found' : 'No available clients'}
                            </h3>
                            <p className="text-gray-500">
                                {clientSearchTerm ? 'Try adjusting your search terms' : 'All clients are currently assigned to coaches'}
                            </p>
                        </div>
                    ) : (
                        clientDetails.map((client) => (
                            <div key={client.IdUser} className="bg-white rounded-lg border p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{client.FirstName}</h3>
                                    <p className="text-sm text-gray-600">{client.EmailID}</p>
                                </div>
                                {alreadyAssigned?.some(val => val.IdUser === client.IdUser) ?
                                    <button
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Done
                                    </button>
                                    :
                                    <button
                                        onClick={() => {
                                            handleCoachStudentAssign(selectedCoach.IdCoach, client.IdUser);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Assign
                                    </button>
                                }


                            </div>
                        ))
                    )}
                </div>
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
                <h1 className="text-xl font-bold">Coach Management</h1>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Coach
                </button>
            </div>

            {/* Coaches List */}
            <div className="space-y-4">
                {coaches?.length === 0 ? (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No coaches added yet</h3>
                        <p className="text-gray-500 mb-4">Start by adding your first coach to the system</p>
                        <button
                            onClick={() => { }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Add First Coach
                        </button>
                    </div>
                ) : (
                    coaches?.map((coach) => (
                        <div key={coach.IdCoach} className="bg-white rounded-lg border overflow-hidden">
                            {/* Banner */}
                            <div
                                className="h-24 bg-gray-200 relative cursor-pointer"
                                onClick={() => viewCoachDetail(coach)}
                                style={{
                                    backgroundImage: coach.BasicDetails.banner_image ? `url(${BASE_URL}/uploads/coach/banner_image/${coach.BasicDetails.banner_image})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                            >
                                {/* Profile Picture */}
                                <div className="absolute -bottom-8 left-4">
                                    <div
                                        className="w-16 h-16 bg-gray-300 rounded-full border-4 border-white"
                                        style={{
                                            backgroundImage: coach.BasicDetails.profile_picture ? `url(${BASE_URL}/uploads/coach/profile_image/${coach.BasicDetails.profile_picture})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                    >
                                        {!coach.BasicDetails.profile_picture && (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User size={20} className="text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="pt-10 p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-semibold">{coach.CoachName}</h3>
                                        <p className="text-sm text-gray-600">{coach.BasicDetails.subject}</p>
                                        <p className="text-sm text-gray-500">{coach.BasicDetails.phone}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedCoach(coach); setShowClientAssignment(true) }}
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                        >
                                            Assign Clients
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{coach.ProfessionalDetails.about}</p>

                                {/* Specializations */}
                                {coach.ProfessionalDetails.specializations.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex flex-wrap gap-1">
                                            {coach.ProfessionalDetails.specializations.slice(0, 3).map((specialization: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                                >
                                                    {specialization}
                                                </span>
                                            ))}
                                            {coach.ProfessionalDetails.specializations.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                    +{coach.ProfessionalDetails.specializations.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Certifications count */}
                                <div className="text-xs text-gray-500">
                                    {coach.ProfessionalDetails.certifications.length} certification{coach.ProfessionalDetails.certifications.length !== 1 ? 's' : ''}
                                </div>

                                {/* Social Media Icons */}
                                {coach.BasicDetails.social_media?.length > 0 && (
                                    <div className="flex gap-2 mt-3">
                                        {coach.BasicDetails.social_media.map((social: { url: string | undefined; platform: string; }, index: React.Key | null | undefined) => (
                                            <a
                                                key={index}
                                                href={social.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-blue-500"
                                            >
                                                {social.platform === 'Facebook' && <Facebook size={16} />}
                                                {social.platform === 'Instagram' && <Instagram size={16} />}
                                                {social.platform === 'Twitter' && <Twitter size={16} />}
                                                {social.platform === 'LinkedIn' && <Linkedin size={16} />}
                                                {social.platform === 'YouTube' && <Youtube size={16} />}
                                            </a>
                                        ))}
                                    </div>
                                )}
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