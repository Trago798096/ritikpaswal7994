import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthState } from '@/hooks/useAuthState'; // To prefill user data
import { Loader2 } from 'lucide-react';

// Schema for validation
const userInfoSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string()
           .min(10, { message: "Phone number must be at least 10 digits." })
           .max(15)
           .regex(/^\+?[0-9\s\-\(\)]+$/, { message: "Invalid phone number format." }), // Allows digits, spaces, hyphens, parens, optional leading +
});

type UserInfoFormData = z.infer<typeof userInfoSchema>;

interface UserInfoFormProps {
  onSubmit: (data: UserInfoFormData) => void;
  isProcessing: boolean;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ onSubmit, isProcessing }) => {
  const { user, profile } = useAuthState(); // Get logged-in user data

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserInfoFormData>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: ''
    }
  });

  // Pre-fill form with user data if available
  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email);
    }
    if (profile?.full_name) {
      setValue('fullName', profile.full_name);
    }
    if (profile?.phone) { // Assuming phone is stored in profile
      setValue('phone', profile.phone);
    }
  }, [user, profile, setValue]);

  const handleFormSubmit = (data: UserInfoFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Enter Your Details</h2>
      
      {/* Full Name */}
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input 
          id="fullName" 
          placeholder="Enter your full name" 
          {...register("fullName")} 
          aria-invalid={errors.fullName ? "true" : "false"}
        />
        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="Enter your email address" 
          {...register("email")} 
          aria-invalid={errors.email ? "true" : "false"}
          readOnly={!!user?.email} // Make read-only if pre-filled from auth
          className={!!user?.email ? 'bg-gray-100 cursor-not-allowed' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" // Use type="tel" for phone numbers
          placeholder="Enter your phone number" 
          {...register("phone")} 
          aria-invalid={errors.phone ? "true" : "false"}
        />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Confirm Booking Details'
        )}
      </Button>
    </form>
  );
};

export default UserInfoForm; 