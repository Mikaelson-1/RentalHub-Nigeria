"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Home, 
  MapPin, 
  Wallet, 
  Camera,
  Upload,
  Video,
  FileText,
  Droplets,
  Zap,
  Shield,
  Box
} from "lucide-react";
import Link from "next/link";

// Validation Schema
const propertySchema = z.object({
  // Step 1: Core Details
  title: z.string().min(3, "Title must be at least 3 characters"),
  propertyType: z.string().min(1, "Please select a property type"),
  vacantUnits: z.number().min(1, "At least 1 unit required"),
  genderPreference: z.string().min(1, "Please select gender preference"),
  
  // Step 2: Location & Amenities
  targetUniversity: z.string(),
  environment: z.string().min(1, "Please select an environment"),
  distanceToCampus: z.string().min(1, "Please select distance"),
  amenities: z.object({
    water: z.array(z.string()),
    power: z.array(z.string()),
    security: z.array(z.string()),
    facilities: z.array(z.string()),
  }),
  
  // Step 3: Financials
  annualRent: z.number().min(1, "Annual rent is required"),
  agencyFee: z.number().min(0, "Agency fee cannot be negative"),
  cautionFee: z.number().min(0, "Caution fee cannot be negative"),
  serviceCharge: z.number().optional(),
  
  // Step 4: Media & Proof
  landmarkDirections: z.string().min(10, "Please provide landmark directions"),
  photos: z.any().optional(),
  video: z.any().optional(),
  verificationDoc: z.any().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const steps = [
  { id: 1, name: "Core Details", icon: Home },
  { id: 2, name: "Location & Amenities", icon: MapPin },
  { id: 3, name: "Financials", icon: Wallet },
  { id: 4, name: "Media & Proof", icon: Camera },
];

const propertyTypes = [
  { value: "single_room", label: "Single Room" },
  { value: "self_contain", label: "Self-Contain" },
  { value: "1_bedroom", label: "1-Bedroom Flat" },
  { value: "2_bedroom", label: "2-Bedroom Flat" },
];

const genderOptions = [
  { value: "any", label: "Any" },
  { value: "male", label: "Male Only" },
  { value: "female", label: "Female Only" },
];

const environments = [
  { value: "uro", label: "Uro" },
  { value: "odo_oja", label: "Odo Oja" },
  { value: "afao", label: "Afao" },
  { value: "ajebandele", label: "Ajebandele" },
  { value: "ikoyi", label: "Ikoyi Estate" },
  { value: "amoye", label: "Amoye Grammar School Area" },
];

const distanceOptions = [
  { value: "under_10", label: "Under 10 mins walk" },
  { value: "15_20", label: "15-20 mins walk" },
  { value: "bike_cab", label: "Requires Bike/Cab" },
];

const amenityCategories = {
  water: {
    icon: Droplets,
    label: "Water",
    options: ["Borehole", "Well", "Pumping Machine"],
  },
  power: {
    icon: Zap,
    label: "Power",
    options: ["Prepaid Meter (Per Room)", "Shared Prepaid Meter", "Estimated Billing"],
  },
  security: {
    icon: Shield,
    label: "Security",
    options: ["Fenced & Gated", "Night Watchman"],
  },
  facilities: {
    icon: Box,
    label: "Facilities",
    options: ["Tiled Floors", "Wardrobe", "Kitchen Cabinet"],
  },
};

export default function AddPropertyForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      targetUniversity: "BOUESTI",
      vacantUnits: 1,
      amenities: {
        water: [],
        power: [],
        security: [],
        facilities: [],
      },
      agencyFee: 0,
      cautionFee: 0,
    },
    mode: "onChange",
  });

  const { register, handleSubmit, formState: { errors, isValid }, trigger, watch, setValue } = methods;

  const watchAmenities = watch("amenities");

  const toggleAmenity = (category: keyof typeof amenityCategories, option: string) => {
    const current = watchAmenities?.[category] || [];
    const updated = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    setValue(`amenities.${category}`, updated, { shouldValidate: true });
  };

  const validateStep = async () => {
    let fieldsToValidate: string[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["title", "propertyType", "vacantUnits", "genderPreference"];
        break;
      case 2:
        fieldsToValidate = ["environment", "distanceToCampus"];
        break;
      case 3:
        fieldsToValidate = ["annualRent", "agencyFee", "cautionFee"];
        break;
      case 4:
        fieldsToValidate = ["landmarkDirections"];
        break;
    }
    
    const result = await trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isStepValid = await validateStep();
    if (isStepValid && currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Form submitted:", data);
    router.push("/landlord");
  };

  const StepIcon = steps[currentStep - 1].icon;

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/landlord"
              className="inline-flex items-center text-gray-600 hover:text-orange-500 transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">List Your Property</h1>
            <p className="text-gray-600 mt-2">
              Complete the form below to add your property to RentalHub NG
            </p>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive
                            ? "bg-orange-500 text-white"
                            : isCompleted
                            ? "bg-gray-900 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isActive ? "text-orange-500" : isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-4 transition-colors ${
                          isCompleted ? "bg-gray-900" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Step Header */}
            <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <StepIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {steps[currentStep - 1].name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Step {currentStep} of {steps.length}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8">
              {/* Step 1: Core Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Listing Title *
                    </label>
                    <input
                      {...register("title")}
                      type="text"
                      placeholder="e.g., Akolade Villa"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type *
                      </label>
                      <select
                        {...register("propertyType")}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select type</option>
                        {propertyTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.propertyType && (
                        <p className="mt-1 text-sm text-red-500">{errors.propertyType.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vacant Units *
                      </label>
                      <input
                        {...register("vacantUnits", { valueAsNumber: true })}
                        type="number"
                        min="1"
                        placeholder="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                      {errors.vacantUnits && (
                        <p className="mt-1 text-sm text-red-500">{errors.vacantUnits.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender Preference *
                    </label>
                    <select
                      {...register("genderPreference")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select preference</option>
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.genderPreference && (
                      <p className="mt-1 text-sm text-red-500">{errors.genderPreference.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Location & Amenities */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target University
                      </label>
                      <select
                        {...register("targetUniversity")}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-gray-50"
                        disabled
                      >
                        <option value="BOUESTI">BOUESTI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Environment/Area *
                      </label>
                      <select
                        {...register("environment")}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select area</option>
                        {environments.map((env) => (
                          <option key={env.value} value={env.value}>
                            {env.label}
                          </option>
                        ))}
                      </select>
                      {errors.environment && (
                        <p className="mt-1 text-sm text-red-500">{errors.environment.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance to Campus *
                    </label>
                    <select
                      {...register("distanceToCampus")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select distance</option>
                      {distanceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.distanceToCampus && (
                      <p className="mt-1 text-sm text-red-500">{errors.distanceToCampus.message}</p>
                    )}
                  </div>

                  {/* Amenities Grid */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Amenities</h3>
                    {Object.entries(amenityCategories).map(([key, category]) => {
                      const Icon = category.icon;
                      return (
                        <div key={key} className="bg-gray-50 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Icon className="w-5 h-5 text-orange-500" />
                            <h4 className="font-medium text-gray-900">{category.label}</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {category.options.map((option) => {
                              const isSelected = watchAmenities?.[key as keyof typeof watchAmenities]?.includes(option);
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => toggleAmenity(key as keyof typeof amenityCategories, option)}
                                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                                    isSelected
                                      ? "bg-orange-500 text-white shadow-md"
                                      : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300"
                                  }`}
                                >
                                  {isSelected && <Check className="inline w-4 h-4 mr-2" />}
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Financials */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-orange-800">
                      <strong>Transparency Note:</strong> All fees are displayed to students upfront. No hidden charges allowed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Rent *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                        <input
                          {...register("annualRent", { valueAsNumber: true })}
                          type="number"
                          placeholder="150000"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                      {errors.annualRent && (
                        <p className="mt-1 text-sm text-red-500">{errors.annualRent.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agreement/Agency Fee *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                        <input
                          {...register("agencyFee", { valueAsNumber: true })}
                          type="number"
                          placeholder="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                      {errors.agencyFee && (
                        <p className="mt-1 text-sm text-red-500">{errors.agencyFee.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Caution/Damage Fee *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                        <input
                          {...register("cautionFee", { valueAsNumber: true })}
                          type="number"
                          placeholder="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                      {errors.cautionFee && (
                        <p className="mt-1 text-sm text-red-500">{errors.cautionFee.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Charge <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                        <input
                          {...register("serviceCharge", { valueAsNumber: true })}
                          type="number"
                          placeholder="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Media & Proof */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* Landmark Directions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closest Landmark Directions *
                    </label>
                    <textarea
                      {...register("landmarkDirections")}
                      rows={3}
                      placeholder="e.g., 3 houses down from Amoye Grammar School gate, opposite the blue mosque"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                    />
                    {errors.landmarkDirections && (
                      <p className="mt-1 text-sm text-red-500">{errors.landmarkDirections.message}</p>
                    )}
                  </div>

                  {/* Property Photos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Photos *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-gray-50">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-700 font-medium mb-2">
                        Drag and drop photos here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Must include at least one exterior/street-view photo to prove existence
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4" />
                        Select Photos
                      </button>
                      <input type="file" multiple accept="image/*" className="hidden" />
                    </div>
                  </div>

                  {/* Video Walkthrough */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Walkthrough <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer bg-gray-50/50">
                      <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm mb-2">
                        Upload a short video tour of the property
                      </p>
                      <p className="text-xs text-gray-400">
                        Max 2 minutes, MP4 format
                      </p>
                      <input type="file" accept="video/*" className="hidden" />
                    </div>
                  </div>

                  {/* Verification Document */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Verification Document
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors cursor-pointer bg-gray-50">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-2">
                        Upload Utility Bill or Property ID
                      </p>
                      <p className="text-sm text-orange-600 mb-3">
                        Kept private. Required for the Verified Landlord badge
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4" />
                        Select Document
                      </button>
                      <input type="file" accept=".pdf,.jpg,.png" className="hidden" />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    currentStep === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-colors"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Submit Listing
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
