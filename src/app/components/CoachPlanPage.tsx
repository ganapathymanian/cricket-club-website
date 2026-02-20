import { useState, useEffect } from "react";
import { Clock, Calendar, Plus, Trash2, Save, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface CoachPlanPageProps {
  apiUrl: string;
  apiKey: string;
  userId: string;
  userName: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  date: string; // ISO date string (e.g., "2026-02-10")
  dayName: string; // e.g., "Monday"
  enabled: boolean;
  timeSlots: TimeSlot[];
}

export function CoachPlanPage({ apiUrl, apiKey, userId, userName }: CoachPlanPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);

  // Get Monday of the week containing the selected date
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Generate array of 7 days starting from Monday
  const generateWeekDays = (startDate: Date) => {
    const days: DayAvailability[] = [];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      days.push({
        date: date.toISOString().split('T')[0], // Format: YYYY-MM-DD
        dayName: dayNames[i],
        enabled: false,
        timeSlots: []
      });
    }
    
    return days;
  };

  useEffect(() => {
    const weekStart = getWeekStart(selectedDate);
    const days = generateWeekDays(weekStart);
    setWeekDays(days);
    fetchCoachAvailabilityForWeek(weekStart);
  }, [selectedDate]);

  const fetchCoachAvailabilityForWeek = async (weekStart: Date) => {
    setLoading(true);
    try {
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const response = await fetch(`${apiUrl}/coach-availability/${userId}/week/${weekStartStr}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setWeekDays(data.data.availability);
      }
    } catch (error) {
      console.error("Error fetching coach availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setWeekDays(weekDays.map(item => 
      item.dayName === day 
        ? { ...item, enabled: !item.enabled }
        : item
    ));
  };

  const addTimeSlot = (day: string) => {
    setWeekDays(weekDays.map(item => {
      if (item.dayName === day) {
        const newSlot: TimeSlot = {
          id: `slot-${Date.now()}`,
          startTime: "09:00",
          endTime: "10:00"
        };
        return { ...item, timeSlots: [...item.timeSlots, newSlot] };
      }
      return item;
    }));
  };

  const removeTimeSlot = (day: string, slotId: string) => {
    setWeekDays(weekDays.map(item => {
      if (item.dayName === day) {
        return {
          ...item,
          timeSlots: item.timeSlots.filter(slot => slot.id !== slotId)
        };
      }
      return item;
    }));
  };

  const updateTimeSlot = (day: string, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setWeekDays(weekDays.map(item => {
      if (item.dayName === day) {
        return {
          ...item,
          timeSlots: item.timeSlots.map(slot =>
            slot.id === slotId
              ? { ...slot, [field]: value }
              : slot
          )
        };
      }
      return item;
    }));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/coach-availability/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          coachId: userId,
          coachName: userName,
          availability: weekDays,
          sendNotification: sendNotification,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (sendNotification) {
          toast.success("Availability saved and notifications sent to all members!", {
            description: "Members will receive an email with your new training dates.",
          });
        } else {
          toast.success("Availability saved successfully!");
        }
      } else {
        toast.error(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const getActiveDaysCount = () => {
    return weekDays.filter(item => item.enabled && item.timeSlots.length > 0).length;
  };

  const getTotalSlotsCount = () => {
    return weekDays.reduce((total, item) => total + (item.enabled ? item.timeSlots.length : 0), 0);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentWeekStart = getWeekStart(selectedDate);
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-red-900">Coach Availability Plan</h2>
          <p className="text-gray-600 mt-2">
            Set your weekly availability schedule for coaching sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchCoachAvailabilityForWeek}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={saveAvailability}
            disabled={saving}
            className="bg-red-900 hover:bg-red-800"
          >
            <Save className="size-4 mr-2" />
            {saving ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-900">{getActiveDaysCount()}</p>
              <p className="text-sm text-gray-600">Active Days</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-900">{getTotalSlotsCount()}</p>
              <p className="text-sm text-gray-600">Time Slots</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-900">{userName}</p>
              <p className="text-sm text-gray-600">Coach Name</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Picker and Week Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="size-5 text-red-900" />
            Select Week
          </CardTitle>
          <CardDescription>
            Choose a date to view and set your availability for that week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <Label className="text-sm mb-2 block">Pick a Date</Label>
              <Input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="max-w-xs"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
                className="bg-red-50 border-red-300 text-red-900"
              >
                This Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateWeek('next')}
              >
                Next Week
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
          
          {weekDays.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 text-center">
                <strong>Selected Week:</strong> {weekDays[0]?.date} to {weekDays[6]?.date}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="size-8 mx-auto animate-spin text-red-900 mb-4" />
          <p className="text-gray-500">Loading availability...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map(dayItem => (
            <Card key={dayItem.date} className={dayItem.enabled ? "border-red-300" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={dayItem.enabled}
                      onCheckedChange={() => toggleDay(dayItem.dayName)}
                      id={`day-${dayItem.date}`}
                    />
                    <Label 
                      htmlFor={`day-${dayItem.date}`}
                      className="text-lg font-semibold cursor-pointer"
                    >
                      {dayItem.dayName} <span className="text-sm text-gray-500 font-normal">({dayItem.date})</span>
                    </Label>
                    {dayItem.enabled && dayItem.timeSlots.length > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {dayItem.timeSlots.length} slot{dayItem.timeSlots.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {dayItem.enabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addTimeSlot(dayItem.dayName)}
                      className="border-red-900 text-red-900 hover:bg-red-50"
                    >
                      <Plus className="size-4 mr-1" />
                      Add Time Slot
                    </Button>
                  )}
                </div>
              </CardHeader>

              {dayItem.enabled && (
                <CardContent className="space-y-3">
                  {dayItem.timeSlots.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <Clock className="size-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No time slots added yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(dayItem.dayName)}
                        className="mt-3"
                      >
                        Add First Slot
                      </Button>
                    </div>
                  ) : (
                    dayItem.timeSlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="size-5 text-red-900" />
                        <div className="flex-1 grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Start Time</Label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(dayItem.dayName, slot.id, 'startTime', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">End Time</Label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(dayItem.dayName, slot.id, 'endTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimeSlot(dayItem.dayName, slot.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Help Text & Notification - Compact */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-2 px-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Quick Guide</p>
            <p className="text-xs text-blue-700">
              Check days → Add time slots → Set times → Save
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-notification"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(checked as boolean)}
              />
              <Label htmlFor="send-notification" className="cursor-pointer text-xs font-semibold text-green-900">
                📧 Email all members when saving
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}