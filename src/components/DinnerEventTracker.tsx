import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Users } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type definitions
interface Event {
  id: string;
  name: string;
  event_date: string;
  created_at?: string;
}

interface Dish {
  id: string;
  event_id: string;
  name: string;
  assigned_to: string | null;
  created_at?: string;
}

declare global {
  interface Window {
    supabase: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
    [key: `dishTimeout_${string}`]: number; // CHANGED from NodeJS.Timeout to number
  }
}

// Load Supabase from CDN
const loadSupabase = async () => {
  if (window.supabase) return window.supabase;
  
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  document.head.appendChild(script);
  
  await new Promise((resolve) => {
    script.onload = resolve;
  });
  
  return window.supabase;
};

const [editingDish, setEditingDish] = useState<Record<string, string>>({});

// Initialize Supabase client
const supabaseUrl = 'https://osmugbupqzpybowrksor.supabase.co';
const supabaseKey = 'sb_publishable_dX_adplCHX5vN9YrSMtV3A_hSfmr1zS';
let supabase: SupabaseClient | null = null;

export default function DinnerEventTracker() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newDishes, setNewDishes] = useState([{ name: '', assignedTo: '' }]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initSupabase = async () => {
      const supabaseLib = await loadSupabase();
      supabase = supabaseLib.createClient(supabaseUrl, supabaseKey);
      setInitialized(true);
      fetchEvents();
    };
    initSupabase();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchDishes(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchDishes = async (eventId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDishes(data || []);
    } catch (error) {
      console.error('Error fetching dishes:', error);
    }
  };

  const createEvent = async () => {
    if (!newEventName || !newEventDate) {
      alert('Please fill in event name and date');
      return;
    }

    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase!
        .from('events')
        .insert([{ name: newEventName, event_date: newEventDate }])
        .select()
        .single();

      if (eventError) throw eventError;

      const dishesToInsert = newDishes
        .filter((dish) => dish.name.trim())
        .map((dish) => ({
          event_id: eventData.id,
          name: dish.name,
          assigned_to: dish.assignedTo || null,
        }));

      if (dishesToInsert.length > 0) {
        const { error: dishError } = await supabase!
          .from('dishes')
          .insert(dishesToInsert);

        if (dishError) throw dishError;
      }

      setNewEventName('');
      setNewEventDate('');
      setNewDishes([{ name: '', assignedTo: '' }]);
      setShowCreateEvent(false);
      fetchEvents();
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const updateDishAssignment = async (dishId: string, assignedTo: string) => {
    try {
      const { error } = await supabase!
        .from('dishes')
        .update({ assigned_to: assignedTo || null })
        .eq('id', dishId);

      if (error) throw error;
      if (selectedEvent) fetchDishes(selectedEvent.id);
    } catch (error) {
      console.error('Error updating dish:', error);
      alert('Error updating assignment');
    }
  };
  
const handleDishNameChange = (dishId: string, value: string) => {
  // Update local state immediately for responsive typing
  setEditingDish(prev => ({ ...prev, [dishId]: value }));
  
  // Clear existing timeout for this dish
  const timeoutKey = `dishTimeout_${dishId}` as `dishTimeout_${string}`;
  if (window[timeoutKey]) {
    clearTimeout(window[timeoutKey]);
  }
  
  // Set new timeout to save after 500ms of no typing
  window[timeoutKey] = setTimeout(() => {
    updateDishAssignment(dishId, value);
  }, 500);
};

  const deleteDish = async (dishId: string) => {
    try {
      const { error } = await supabase!.from('dishes').delete().eq('id', dishId);

      if (error) throw error;
      if (selectedEvent) fetchDishes(selectedEvent.id);
    } catch (error) {
      console.error('Error deleting dish:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this event? This will also delete all associated dishes.'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setDishes([]);
      }
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const addDishToEvent = async () => {
    const dishName = prompt('Enter dish name:');
    if (!dishName || !selectedEvent) return;

    try {
      const { error } = await supabase!
        .from('dishes')
        .insert([
          { event_id: selectedEvent.id, name: dishName, assigned_to: null },
        ]);

      if (error) throw error;
      fetchDishes(selectedEvent.id);
    } catch (error) {
      console.error('Error adding dish:', error);
    }
  };

 if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-xl text-orange-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-orange-900 mb-2">Dinner Event Tracker</h1>
          <p className="text-orange-700">Organize your dinner events and dish assignments</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-orange-600" />
                Events
              </h2>
              <button
                onClick={() => setShowCreateEvent(!showCreateEvent)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Plus size={20} />
                New Event
              </button>
            </div>

            {showCreateEvent && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg flex-shrink-0">
                <h3 className="font-semibold mb-3 text-orange-900">Create New Event</h3>
                <input
                  type="text"
                  placeholder="Event name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full p-2 border border-orange-300 rounded mb-2"
                />
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full p-2 border border-orange-300 rounded mb-3"
                />
                
                <div className="mb-3">
                  <label className="font-medium text-sm text-gray-700 mb-2 block">Dishes:</label>
                  {newDishes.map((dish, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Dish name"
                        value={dish.name}
                        onChange={(e) => {
                          const updated = [...newDishes];
                          updated[index].name = e.target.value;
                          setNewDishes(updated);
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Assigned to (optional)"
                        value={dish.assignedTo}
                        onChange={(e) => {
                          const updated = [...newDishes];
                          updated[index].assignedTo = e.target.value;
                          setNewDishes(updated);
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setNewDishes([...newDishes, { name: '', assignedTo: '' }])}
                    className="text-orange-600 text-sm hover:text-orange-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add another dish
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createEvent}
                    disabled={loading}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateEvent(false);
                      setNewEventName('');
                      setNewEventDate('');
                      setNewDishes([{ name: '', assignedTo: '' }]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No events yet. Create one!</p>
              ) : (
                events.map(event => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg transition ${
                      selectedEvent?.id === event.id
                        ? 'bg-orange-100 border-2 border-orange-600'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div onClick={() => setSelectedEvent(event)} className="flex-1 cursor-pointer">
                        <h3 className="font-semibold text-gray-800">{event.name}</h3>
                        <p className="text-sm text-gray-600">{new Date(event.event_date).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event.id);
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Delete event"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-orange-600" />
                Dishes
              </h2>
              {selectedEvent && (
                <button
                  onClick={addDishToEvent}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Dish
                </button>
              )}
            </div>

            {!selectedEvent ? (
              <p className="text-gray-500 text-center py-8">Select an event to view dishes</p>
            ) : dishes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No dishes yet. Add one!</p>
            ) : (
              <div className="space-y-3">
                {dishes.map(dish => (
                  <div key={dish.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{dish.name}</h3>
                      <button
                        onClick={() => deleteDish(dish.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter your name to claim this dish"
                      value={editingDish[dish.id] !== undefined ? editingDish[dish.id] : (dish.assigned_to || '')}
                      onChange={(e) => handleDishNameChange(dish.id, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                    {dish.assigned_to && (
                      <p className="text-sm text-green-600 mt-1">✓ Assigned to {dish.assigned_to}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}