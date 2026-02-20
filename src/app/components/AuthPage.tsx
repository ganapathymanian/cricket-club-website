import { useState, useEffect } from "react";
import { Mail, Lock, User, Phone, MessageCircle, UserPlus, Users, Calendar, MapPin, AlertCircle, ShieldCheck, LogIn, ArrowRight, Facebook } from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";

interface AuthPageProps {
  apiUrl: string;
  apiKey: string;
  onLoginSuccess: (accessToken: string, userEmail: string, userName?: string, userRole?: string, userId?: string) => void;
}

type AuthStep = "initial" | "login" | "signup";

export function AuthPage({ apiUrl, apiKey, onLoginSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("initial");
  const [isMinor, setIsMinor] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [socialProvider, setSocialProvider] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    mobileNumber: "",
    whatsappNumber: "",
    facebookId: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    oldAdamstownUserId: "",
    playedInIreland: false,
    cricketIrelandId: "",
    dataConsent: false,
    profilePhoto: null as string | null,
  });

  // Check if user is a minor based on date of birth
  useEffect(() => {
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        setIsMinor(age - 1 < 18);
      } else {
        setIsMinor(age < 18);
      }
    }
  }, [formData.dateOfBirth]);

  const handleEmailCheck = async () => {
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      // Check if email exists in the system
      const response = await fetch(`${apiUrl}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (data.exists) {
        // User exists - show login form
        setUserEmail(formData.email);
        setAuthStep("login");
        toast.info("Welcome back! Please enter your password.");
      } else {
        // New user - show full signup form
        setUserEmail(formData.email);
        setAuthStep("signup");
        toast.info("New user detected! Please complete your profile.");
      }
    } catch (error) {
      console.error("Email check error:", error);
      toast.error("Failed to verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Google login failed - no credential received");
      return;
    }

    setLoading(true);
    try {
      // Send the Google ID token to our backend for verification
      const response = await fetch(`${apiUrl}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ 
          credential: credentialResponse.credential 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsRegistration) {
          // User authenticated with Google but needs to complete registration
          setFormData(prev => ({
            ...prev,
            email: data.email || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
          }));
          setUserEmail(data.email || "");
          setSocialProvider("google");
          setAuthStep("signup");
          toast.info("Please complete your profile to finish registration");
        } else {
          throw new Error(data.message || "Google authentication failed");
        }
        return;
      }

      // Login successful
      toast.success("Welcome back!");
      onLoginSuccess(
        data.token,
        data.user.email,
        data.user.name,
        data.user.role,
        data.user.id
      );
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error instanceof Error ? error.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google sign-in was cancelled or failed");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Login successful!");
        onLoginSuccess(data.accessToken, data.user.email, data.user.name, data.user.role, data.user.id);
      } else {
        toast.error(data.error || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateSignupForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter your first and last name");
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return false;
    }
    if (!formData.gender) {
      toast.error("Please select your gender");
      return false;
    }
    if (!formData.dateOfBirth) {
      toast.error("Please enter your date of birth");
      return false;
    }
    if (!formData.mobileNumber.trim()) {
      toast.error("Please enter your mobile number");
      return false;
    }
    
    // Minor-specific validations
    if (isMinor) {
      if (!formData.address.trim()) {
        toast.error("Address is required for minors");
        return false;
      }
      if (!formData.emergencyContactName.trim()) {
        toast.error("Emergency contact name is required for minors");
        return false;
      }
      if (!formData.emergencyContactPhone.trim()) {
        toast.error("Emergency contact phone is required for minors");
        return false;
      }
      if (!formData.emergencyContactRelationship.trim()) {
        toast.error("Emergency contact relationship is required for minors");
        return false;
      }
    } else {
      if (!formData.dataConsent) {
        toast.error("Please provide consent to store your personal data");
        return false;
      }
    }
    
    if (formData.playedInIreland && !formData.cricketIrelandId.trim()) {
      toast.error("Please enter your Cricket Ireland User ID");
      return false;
    }
    
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignupForm()) {
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        isMinor,
        mobileNumber: formData.mobileNumber,
        whatsappNumber: formData.whatsappNumber || formData.mobileNumber,
        facebookId: formData.facebookId,
        address: formData.address,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        oldAdamstownUserId: formData.oldAdamstownUserId,
        playedInIreland: formData.playedInIreland,
        cricketIrelandId: formData.cricketIrelandId,
        dataConsent: isMinor ? true : formData.dataConsent,
        socialProvider: socialProvider,
      };
      
      console.log("Signup request:", { email: formData.email, hasPassword: !!formData.password });
      
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Signup response status:", response.status);
      console.log("Signup response ok:", response.ok);
      
      const data = await response.json();
      console.log("Signup response:", { success: data.success, hasAccessToken: !!data.accessToken, error: data.error });
      console.log("Full signup response:", data);

      if (data.success) {
        toast.success("Account created successfully! Logging you in...");
        
        if (!data.accessToken) {
          console.error("No access token in signup response");
          toast.error("Login failed - no access token received");
          return;
        }
        
        if (!data.user) {
          console.error("No user data in signup response");
          toast.error("Login failed - no user data received");
          return;
        }
        
        // Upload profile photo if provided
        if (formData.profilePhoto && data.user.id && data.accessToken) {
          try {
            await fetch(`${apiUrl}/users/${data.user.id}/profile-photo`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.accessToken}`,
              },
              body: JSON.stringify({ profilePhoto: formData.profilePhoto }),
            });
            console.log("Profile photo uploaded successfully");
          } catch (photoError) {
            console.error("Failed to upload profile photo:", photoError);
            // Don't block signup if photo upload fails
          }
        }
        
        console.log("Calling onLoginSuccess with:", { 
          hasToken: !!data.accessToken, 
          email: data.user.email, 
          name: data.user.name, 
          role: data.user.role,
          userId: data.user.id
        });
        
        onLoginSuccess(data.accessToken, data.user.email, data.user.name, data.user.role, data.user.id);
      } else {
        console.error("Signup failed:", data.error);
        toast.error(data.error || "Failed to create account");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCheckboxChange = (field: string, value: boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const resetToInitial = () => {
    setAuthStep("initial");
    setUserEmail("");
    setSocialProvider(null);
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      mobileNumber: "",
      whatsappNumber: "",
      facebookId: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      oldAdamstownUserId: "",
      playedInIreland: false,
      cricketIrelandId: "",
      dataConsent: false,
      profilePhoto: null,
    });
  };

  // Initial screen - Email or Social Login
  if (authStep === "initial") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-2 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-t-lg">
            <div className="flex justify-center mb-2">
              <div className="size-16 bg-white rounded-full flex items-center justify-center">
                <UserPlus className="size-8 text-red-900" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Adamstown Cricket Club</CardTitle>
            <CardDescription className="text-red-100">
              Sign in or create your account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Google Sign-In */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 text-center">Continue with</p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="320"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-500 font-medium">OR</span>
              <Separator className="flex-1" />
            </div>

            {/* Email Entry */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-base font-semibold">
                  <Mail className="size-4 text-red-900" />
                  Enter Your Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailCheck()}
                  className="text-base py-6"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleEmailCheck}
                disabled={loading}
                className="w-full bg-red-900 hover:bg-red-800 text-lg py-6"
              >
                {loading ? (
                  "Checking..."
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-5 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 text-center">
                We'll check if you have an account. New users will be guided to complete registration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login screen - Existing user
  if (authStep === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-2 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-t-lg">
            <div className="flex justify-center mb-2">
              <div className="size-16 bg-white rounded-full flex items-center justify-center">
                <LogIn className="size-8 text-red-900" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
            <CardDescription className="text-red-100">
              Sign in to your account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail" className="flex items-center gap-2">
                  <Mail className="size-4 text-red-900" />
                  Email Address
                </Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginPassword" className="flex items-center gap-2">
                  <Lock className="size-4 text-red-900" />
                  Password
                </Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-900 hover:bg-red-800 text-lg py-6"
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <LogIn className="size-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <Separator />

            <div className="text-center">
              <Button
                variant="link"
                onClick={resetToInitial}
                className="text-red-900 font-semibold"
              >
                ← Use a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup screen - New user (full form)
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl my-8">
        <CardHeader className="text-center space-y-2 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-t-lg">
          <div className="flex justify-center mb-2">
            <div className="size-16 bg-white rounded-full flex items-center justify-center">
              <UserPlus className="size-8 text-red-900" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription className="text-red-100">
            Please fill in all required details to join the club
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Email Display */}
            <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="size-5 text-green-700" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Registering with:</p>
                  <p className="text-base font-bold text-green-800">{userEmail}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToInitial}
                  className="ml-auto text-green-700"
                >
                  Change
                </Button>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 border-b-2 border-red-200 pb-2">
                Personal Information
              </h3>

              {/* Profile Photo Upload */}
              <ProfilePhotoUpload
                currentPhoto={formData.profilePhoto}
                onPhotoChange={(photo) => setFormData({ ...formData, profilePhoto: photo })}
                size="md"
                label="Profile Photo (Recommended)"
                showRemove={true}
              />
              <p className="text-xs text-gray-500 -mt-2">
                Upload a clear face photo for attendance scanning. You can also add this later from your profile.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    <User className="size-4 text-red-900" />
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="size-4 text-red-900" />
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="flex items-center gap-2">
                    <Users className="size-4 text-red-900" />
                    Gender *
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar className="size-4 text-red-900" />
                    Date of Birth *
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    required
                  />
                </div>
              </div>

              {isMinor && (
                <div className="p-4 bg-orange-50 border-2 border-orange-400 rounded-lg animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-orange-900">Minor Detected (Under 18)</h4>
                      <p className="text-sm text-orange-800 mt-1">
                        All fields below are <strong>mandatory</strong> for members under 18 years old.
                        A parent/guardian consent is required for registration.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="size-4 text-red-900" />
                  Create Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 border-b-2 border-red-200 pb-2">
                Contact Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber" className="flex items-center gap-2">
                  <Phone className="size-4 text-red-900" />
                  Mobile Number * {isMinor && <span className="text-orange-600">(Parent/Guardian)</span>}
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="+353 XX XXX XXXX"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange("mobileNumber", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-green-600" />
                  WhatsApp Number (if different)
                </Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="+353 XX XXX XXXX"
                  value={formData.whatsappNumber}
                  onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Leave empty if same as mobile number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookId" className="flex items-center gap-2">
                  <Facebook className="size-4 text-blue-600" />
                  Facebook ID/Username (Optional)
                </Label>
                <Input
                  id="facebookId"
                  type="text"
                  placeholder="facebook.com/your-username"
                  value={formData.facebookId}
                  onChange={(e) => handleInputChange("facebookId", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="size-4 text-red-900" />
                  Address {isMinor && <span className="text-orange-600">*</span>}
                </Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={3}
                  required={isMinor}
                />
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 border-b-2 border-red-200 pb-2">
                Emergency Contact Details {isMinor && <span className="text-orange-600">(Required for Minors)</span>}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName" className="flex items-center gap-2">
                  <User className="size-4 text-red-900" />
                  Emergency Contact Name {isMinor && "*"}
                </Label>
                <Input
                  id="emergencyContactName"
                  type="text"
                  placeholder="Full name"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                  required={isMinor}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone" className="flex items-center gap-2">
                    <Phone className="size-4 text-red-900" />
                    Emergency Contact Phone {isMinor && "*"}
                  </Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    placeholder="+353 XX XXX XXXX"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                    required={isMinor}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship" className="flex items-center gap-2">
                    <Users className="size-4 text-red-900" />
                    Relationship {isMinor && "*"}
                  </Label>
                  <Input
                    id="emergencyContactRelationship"
                    type="text"
                    placeholder="e.g., Parent, Spouse, Sibling"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => handleInputChange("emergencyContactRelationship", e.target.value)}
                    required={isMinor}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Cricket Ireland Information */}
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  🏏 Cricket Leinster Registration
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="playedInIreland"
                      checked={formData.playedInIreland}
                      onCheckedChange={(checked) => handleCheckboxChange("playedInIreland", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="playedInIreland" className="cursor-pointer font-semibold text-green-900">
                        Have you played cricket in Ireland?
                      </Label>
                      <p className="text-sm text-green-700 mt-1">
                        Check this if you have previously registered with Cricket Leinster
                      </p>
                    </div>
                  </div>

                  {formData.playedInIreland && (
                    <div className="space-y-2 ml-8 animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="cricketIrelandId" className="text-green-900">
                        Cricket Leinster User ID *
                      </Label>
                      <Input
                        id="cricketIrelandId"
                        type="text"
                        placeholder="Enter your Cricket Leinster ID"
                        value={formData.cricketIrelandId}
                        onChange={(e) => handleInputChange("cricketIrelandId", e.target.value)}
                        className="bg-white"
                        required={formData.playedInIreland}
                      />
                      <p className="text-xs text-green-600">
                        This helps us link your Cricket Leinster records to your club profile
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Migration Information */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Existing Member?</h3>
                <p className="text-sm text-blue-800 mb-3">
                  If you had an account on the old Adamstown website, please enter your old User ID
                  below. This helps us link your historical data to your new account.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="oldUserId" className="text-blue-900">
                    Old Adamstown User ID (Optional)
                  </Label>
                  <Input
                    id="oldUserId"
                    type="text"
                    placeholder="Your old user ID or username"
                    value={formData.oldAdamstownUserId}
                    onChange={(e) => handleInputChange("oldAdamstownUserId", e.target.value)}
                    className="bg-white"
                  />
                  <p className="text-xs text-blue-600">
                    Don't remember? Leave it empty - you can add it later from your profile.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Data Consent (for Adults/Youth only) */}
            {!isMinor && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="dataConsent"
                      checked={formData.dataConsent}
                      onCheckedChange={(checked) => handleCheckboxChange("dataConsent", checked as boolean)}
                      required={!isMinor}
                    />
                    <div className="flex-1">
                      <Label htmlFor="dataConsent" className="cursor-pointer font-semibold text-purple-900 flex items-center gap-2">
                        <ShieldCheck className="size-5" />
                        Data Storage Consent *
                      </Label>
                      <p className="text-sm text-purple-800 mt-2 leading-relaxed">
                        I consent to <strong>Adamstown Cricket Club</strong> storing and processing my personal information 
                        (including name, email, date of birth, address, contact details, and emergency contact information) 
                        in their secure database for the purposes of:
                      </p>
                      <ul className="text-sm text-purple-800 mt-2 ml-4 space-y-1 list-disc">
                        <li>Club membership management and communications</li>
                        <li>Training and coaching session bookings</li>
                        <li>Match fixture scheduling and team selection</li>
                        <li>Emergency contact in case of medical incidents</li>
                        <li>Historical performance records and statistics</li>
                      </ul>
                      <p className="text-sm text-purple-800 mt-2">
                        Your data will be handled in accordance with GDPR regulations and will not be shared with third parties 
                        without your explicit consent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isMinor && (
              <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>Note for Minors:</strong> By completing this registration, a parent or legal guardian confirms 
                  consent to store the minor's personal data for club membership purposes as outlined in our privacy policy. 
                  All emergency contact details must be for a parent or legal guardian.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-900 hover:bg-red-800 text-lg py-6"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  <UserPlus className="size-5 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>

          <Separator />

          <div className="text-center">
            <Button
              variant="link"
              onClick={resetToInitial}
              className="text-red-900 font-semibold"
            >
              ← Start over with different email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}