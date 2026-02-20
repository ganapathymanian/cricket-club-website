import { useState, useEffect } from "react";
import { Mail, Lock, User, Phone, MessageCircle, Chrome, Facebook, UserPlus, Users, Calendar, MapPin, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";

interface SignUpPageProps {
  apiUrl: string;
  apiKey: string;
  onSignUpSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function SignUpPage({ apiUrl, apiKey, onSignUpSuccess, onSwitchToLogin }: SignUpPageProps) {
  const [loading, setLoading] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
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

  const handleSocialSignUp = async (provider: "google" | "facebook") => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/social-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Store that this is a social login for later completion
        localStorage.setItem("socialLoginProvider", provider);
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to initiate social login");
      }
    } catch (error) {
      console.error("Social sign-up error:", error);
      toast.error("Failed to connect with social provider");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Basic validations
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter your first and last name");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
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
    
    // Minor-specific validations (all fields mandatory)
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
      // Adult/Youth consent validation
      if (!formData.dataConsent) {
        toast.error("Please provide consent to store your personal data");
        return false;
      }
    }
    
    // Cricket Ireland validation
    if (formData.playedInIreland && !formData.cricketIrelandId.trim()) {
      toast.error("Please enter your Cricket Ireland User ID");
      return false;
    }
    
    return true;
  };

  const handleManualSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
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
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Account created successfully! Please log in.");
        onSignUpSuccess();
      } else {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl my-8">
        <CardHeader className="text-center space-y-2 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-t-lg">
          <div className="flex justify-center mb-2">
            <div className="size-16 bg-white rounded-full flex items-center justify-center">
              <UserPlus className="size-8 text-red-900" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Join Adamstown Cricket Club</CardTitle>
          <CardDescription className="text-red-100">
            Create your account to access all club features
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Social Sign-Up Options */}
          <div className="space-y-3">
            <p className="text-base font-bold text-gray-900 text-center mb-4">Quick Sign-Up with Social Account</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSocialSignUp("google")}
                disabled={loading}
                className="w-full border-2 hover:bg-blue-50 hover:border-blue-400 py-6 text-base font-semibold"
              >
                <Chrome className="size-6 mr-2 text-blue-600" />
                Sign in with Google
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSocialSignUp("facebook")}
                disabled={loading}
                className="w-full border-2 hover:bg-blue-50 hover:border-blue-600 py-6 text-base font-semibold"
              >
                <Facebook className="size-6 mr-2 text-blue-700" />
                Sign in with Facebook
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>✓ Using social login:</strong> We'll automatically get your first name, last name, gender, email, 
                and Facebook ID (if Facebook). You'll need to complete your profile with DOB, address, and emergency contact details after authorization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-sm text-gray-500 font-medium">OR SIGN UP MANUALLY</span>
            <Separator className="flex-1" />
          </div>

          {/* Manual Sign-Up Form */}
          <form onSubmit={handleManualSignUp} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 border-b-2 border-red-200 pb-2">
                Personal Information
              </h3>

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
                    <AlertCircle className="size-5 text-orange-600 mt-0.5" />
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
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="size-4 text-red-900" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="size-4 text-red-900" />
                    Password *
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="size-4 text-red-900" />
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                  />
                </div>
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
                  🏏 Cricket Ireland Registration
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
                        Check this if you have previously registered with Cricket Ireland
                      </p>
                    </div>
                  </div>

                  {formData.playedInIreland && (
                    <div className="space-y-2 ml-8 animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="cricketIrelandId" className="text-green-900">
                        Cricket Ireland User ID *
                      </Label>
                      <Input
                        id="cricketIrelandId"
                        type="text"
                        placeholder="Enter your Cricket Ireland ID"
                        value={formData.cricketIrelandId}
                        onChange={(e) => handleInputChange("cricketIrelandId", e.target.value)}
                        className="bg-white"
                        required={formData.playedInIreland}
                      />
                      <p className="text-xs text-green-600">
                        This helps us link your Cricket Ireland records to your club profile
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
                  Create Account
                </>
              )}
            </Button>
          </form>

          <Separator />

          {/* Switch to Login */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={onSwitchToLogin}
                className="text-red-900 font-semibold p-0 h-auto"
              >
                Log in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
