import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Wrench, Clock, CheckCircle, Plus } from "lucide-react";
import type { Event } from "@shared/schema";

interface EventTimelineProps {
  events: Event[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "reparatie":
        return <Wrench className="h-4 w-4 text-gwc-success" />;
      case "uitleen":
        return <Clock className="h-4 w-4 text-gwc-warning" />;
      case "retour":
        return <CheckCircle className="h-4 w-4 text-gwc-success" />;
      case "creatie":
        return <Plus className="h-4 w-4 text-gwc-secondary" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "reparatie":
        return "bg-gwc-success bg-opacity-10";
      case "uitleen":
        return "bg-gwc-warning bg-opacity-10";
      case "retour":
        return "bg-gwc-success bg-opacity-10";
      case "creatie":
        return "bg-gwc-secondary bg-opacity-10";
      default:
        return "bg-gray-100";
    }
  };

  const getEventTitle = (eventType: string) => {
    switch (eventType) {
      case "reparatie":
        return "Reparatie";
      case "uitleen":
        return "Uitgeleend";
      case "retour":
        return "Retour";
      case "creatie":
        return "Aangemaakt";
      default:
        return eventType;
    }
  };

  if (!events || events.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-gray-600" />
          Producthistorie
        </h3>
        <p className="text-gray-500 text-center py-8">Nog geen events geregistreerd</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <Clock className="h-5 w-5 mr-2 text-gray-600" />
        Producthistorie
      </h3>
      
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 ${getEventColor(event.eventType)} rounded-full flex items-center justify-center`}>
              {getEventIcon(event.eventType)}
            </div>
            <div className={`flex-1 ${index < events.length - 1 ? 'border-l-2 border-gray-100 pl-4 pb-4' : 'pl-4'}`}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm">{getEventTitle(event.eventType)}</h4>
                <span className="text-xs text-gray-500">
                  {format(new Date(event.createdAt), "PPp", { locale: nl })}
                </span>
              </div>
              <p className="text-sm text-gray-700">{event.description}</p>
              
              {/* Additional event details */}
              {event.loanReference && (
                <p className="text-xs text-gray-600 mt-1">
                  Uitgeleend aan: {event.loanReference}
                </p>
              )}
              {event.expectedReturn && (
                <p className="text-xs text-gray-600 mt-1">
                  Verwachte retour: {format(new Date(event.expectedReturn), "PP", { locale: nl })}
                </p>
              )}
              {event.returnCondition && (
                <p className="text-xs text-gray-600 mt-1">
                  Staat bij retour: {event.returnCondition}
                </p>
              )}
              {event.returnNotes && (
                <p className="text-xs text-gray-600 mt-1">
                  Opmerkingen: {event.returnNotes}
                </p>
              )}
              
              {/* Event photo */}
              {event.photoUrl && (
                <img 
                  src={event.photoUrl} 
                  alt="Event foto"
                  className="mt-2 w-24 h-24 object-cover rounded border"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
