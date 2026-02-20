import { useState, useEffect } from "react";
import { Calendar, Clock, User, ShoppingCart, Trash2, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";

interface TrainingPageProps {
  apiUrl: string;
  apiKey: string;
  userId: string;
  userName: string;
}

interface Coach {
  coachId: string;
  coachName: string;
  availability: DayAvailability[];
}

interface DayAvailability {
  day: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface CoachingType {
  type: "1-to-1" | "1-to-2" | "1-to-3";
  label: string;
  fees: number;
  duration: number;
}

interface BookingItem {
  id: string;
  coachId: string;
  coachName: string;
  date: string;
  timeSlot: TimeSlot;
  coachingType: CoachingType;
}

export function TrainingPage({ apiUrl, apiKey, userId, userName }: TrainingPageProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [coachingTypes, setCoachingTypes] = useState<CoachingType[]>([]);
  const [stripePaymentLink, setStripePaymentLink] = useState("");
  const [currency, setCurrency] = useState("EUR");
  
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedCoachingType, setSelectedCoachingType] = useState<CoachingType | null>(null);
  
  const [cart, setCart] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoaches();
    fetchTrainingSettings();
  }, []);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/coaches`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setCoaches(data.data);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
      toast.error("Failed to load coaches");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingSettings = async () => {
    try {
      const response = await fetch(`${apiUrl}/training-settings`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setCoachingTypes(data.data.coachingTypes);
        setStripePaymentLink(data.data.stripePaymentLink);
        setCurrency(data.data.currency);
      }
    } catch (error) {
      console.error("Error fetching training settings:", error);
    }
  };

  const getAvailableDates = (): string[] => {
    if (!selectedCoach) return [];

    const dates: string[] = [];
    const today = new Date();
    
    // Generate next 60 days
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayAvailability = selectedCoach.availability.find(a => a.day === dayName);
      
      if (dayAvailability?.enabled && dayAvailability.timeSlots.length > 0) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const getAvailableTimeSlots = (): TimeSlot[] => {
    if (!selectedCoach || !selectedDate) return [];

    const date = new Date(selectedDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = selectedCoach.availability.find(a => a.day === dayName);
    
    return dayAvailability?.timeSlots || [];
  };

  const toggleTimeSlot = (slotId: string) => {
    if (selectedTimeSlots.includes(slotId)) {
      setSelectedTimeSlots(selectedTimeSlots.filter(id => id !== slotId));
    } else {
      setSelectedTimeSlots([...selectedTimeSlots, slotId]);
    }
  };

  const addToCart = () => {
    if (!selectedCoach || !selectedDate || selectedTimeSlots.length === 0 || !selectedCoachingType) {
      toast.error("Please select coach, date, time slots, and coaching type");
      return;
    }

    const availableSlots = getAvailableTimeSlots();
    const newBookings: BookingItem[] = selectedTimeSlots.map(slotId => {
      const timeSlot = availableSlots.find(slot => slot.id === slotId)!;
      return {
        id: `booking-${Date.now()}-${slotId}`,
        coachId: selectedCoach.coachId,
        coachName: selectedCoach.coachName,
        date: selectedDate,
        timeSlot: timeSlot,
        coachingType: selectedCoachingType,
      };
    });

    setCart([...cart, ...newBookings]);
    setSelectedTimeSlots([]);
    setSelectedDate("");
    toast.success(`Added ${newBookings.length} session(s) to cart`);
  };

  const removeFromCart = (bookingId: string) => {
    setCart(cart.filter(item => item.id !== bookingId));
    toast.success("Removed from cart");
  };

  const getTotalCost = () => {
    return cart.reduce((total, item) => total + item.coachingType.fees, 0);
  };

  const proceedToCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!stripePaymentLink) {
      toast.error("Payment link not configured. Please contact admin.");
      return;
    }

    try {
      // Save bookings to database
      const response = await fetch(`${apiUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          userId: userId,
          userName: userName,
          bookings: cart,
          totalAmount: getTotalCost(),
          currency: currency,
          status: "pending_payment"
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to Stripe
        window.location.href = stripePaymentLink;
      } else {
        toast.error(`Failed to create booking: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to proceed to checkout");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-red-900">Training & Coaching</h2>
        <p className="text-gray-600 mt-2">
          Book one-on-one coaching sessions with our professional coaches
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Coach */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Step 1: Select Coach
              </CardTitle>
              <CardDescription>Choose your preferred coach</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500 text-center py-4">Loading coaches...</p>
              ) : coaches.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <User className="size-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No coaches available at the moment</p>
                  <p className="text-sm text-gray-400 mt-1">Please check back later</p>
                </div>
              ) : (
                <Select
                  value={selectedCoach?.coachId || ""}
                  onValueChange={(value) => {
                    const coach = coaches.find(c => c.coachId === value);
                    setSelectedCoach(coach || null);
                    setSelectedDate("");
                    setSelectedTimeSlots([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map(coach => (
                      <SelectItem key={coach.coachId} value={coach.coachId}>
                        {coach.coachName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Select Date */}
          {selectedCoach && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Step 2: Select Date
                </CardTitle>
                <CardDescription>Choose an available date</CardDescription>
              </CardHeader>
              <CardContent>
                {getAvailableDates().length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No available dates for this coach
                  </p>
                ) : (
                  <Select
                    value={selectedDate}
                    onValueChange={(value) => {
                      setSelectedDate(value);
                      setSelectedTimeSlots([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a date" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {getAvailableDates().map(date => (
                        <SelectItem key={date} value={date}>
                          {formatDate(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          {/* Select Time Slots */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Step 3: Select Time Slots
                </CardTitle>
                <CardDescription>Choose one or more time slots (you can select multiple)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {getAvailableTimeSlots().map(slot => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTimeSlots.includes(slot.id)
                          ? "bg-red-50 border-red-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleTimeSlot(slot.id)}
                    >
                      <Checkbox
                        checked={selectedTimeSlots.includes(slot.id)}
                        onCheckedChange={() => toggleTimeSlot(slot.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {slot.startTime} - {slot.endTime}
                        </p>
                      </div>
                      {selectedTimeSlots.includes(slot.id) && (
                        <CheckCircle className="size-5 text-red-900" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Select Coaching Type */}
          {selectedTimeSlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Step 4: Select Coaching Type
                </CardTitle>
                <CardDescription>Choose your preferred session type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coachingTypes.map(type => (
                    <div
                      key={type.type}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCoachingType?.type === type.type
                          ? "bg-red-50 border-red-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedCoachingType(type)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{type.label}</p>
                          <p className="text-sm text-gray-600">{type.duration} minutes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-900">
                            {currency} {type.fees.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCoachingType && (
                  <Button
                    onClick={addToCart}
                    className="w-full mt-4 bg-red-900 hover:bg-red-800"
                  >
                    <ShoppingCart className="size-4 mr-2" />
                    Add to Cart
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
                Your Cart
              </CardTitle>
              <CardDescription>
                {cart.length} session{cart.length !== 1 ? 's' : ''} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <ShoppingCart className="size-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Your cart is empty</p>
                  <p className="text-sm text-gray-400 mt-1">Add sessions to get started</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{item.coachName}</p>
                            <p className="text-xs text-gray-600">
                              {formatDate(item.date)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {item.timeSlot.startTime} - {item.timeSlot.endTime}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:bg-red-50 -mt-1 -mr-1"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            {item.coachingType.label}
                          </Badge>
                          <p className="font-semibold text-red-900">
                            {currency} {item.coachingType.fees.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-red-900">
                        {currency} {getTotalCost().toFixed(2)}
                      </span>
                    </div>

                    <Button
                      onClick={proceedToCheckout}
                      className="w-full bg-red-900 hover:bg-red-800"
                      disabled={!stripePaymentLink}
                    >
                      <CreditCard className="size-4 mr-2" />
                      Proceed to Payment
                    </Button>

                    {!stripePaymentLink && (
                      <p className="text-xs text-red-600 text-center">
                        Payment not configured. Contact admin.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
