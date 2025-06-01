import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Mail, Phone, MapPin, Package, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import type { Event, Product } from "@shared/schema";

type LoanEvent = Event & { product: Product };

export default function LoanOverview() {
  const { user: currentUser } = useAuth();
  const { data: loanEvents, isLoading } = useQuery<LoanEvent[]>({
    queryKey: ["/api/loans/active"],
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter loan events based on user role
  const userRole = (currentUser as any)?.role;
  const currentUserEmail = (currentUser as any)?.email;
  
  const activeLoanEvents = loanEvents?.filter(event => {
    if (event.eventType !== "uitleen" || !event.borrowerName) return false;
    
    // Admins and managers can see all loans
    if (userRole === 'admin' || userRole === 'manager') return true;
    
    // Regular users can only see their own loans
    return event.borrowerEmail === currentUserEmail;
  }) || [];

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-medium">Uitleenoverzicht</h1>
            <Badge variant="secondary">
              {activeLoanEvents.length} actieve uitleningen
            </Badge>
          </div>
        </div>

        {activeLoanEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Geen actieve uitleningen
              </h3>
              <p className="text-gray-600">
                Er zijn momenteel geen producten uitgeleend.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeLoanEvents.map((loanEvent) => {
              const isOverdue = loanEvent.expectedReturn && new Date() > new Date(loanEvent.expectedReturn);
              const daysUntilReturn = loanEvent.expectedReturn 
                ? Math.ceil((new Date(loanEvent.expectedReturn).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card key={loanEvent.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-gwc-primary" />
                        <div>
                          <CardTitle className="text-lg">{loanEvent.product.name}</CardTitle>
                          <p className="text-sm text-gray-600">GTIN: {loanEvent.product.gtin}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {isOverdue ? (
                          <Badge variant="destructive">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.abs(daysUntilReturn || 0)} dagen te laat
                          </Badge>
                        ) : daysUntilReturn !== null && daysUntilReturn <= 7 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysUntilReturn} dagen resterend
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Uitgeleend</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Borrower Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Uitlener informatie
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{loanEvent.borrowerName}</p>
                          {loanEvent.borrowerEmail && (
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              <a 
                                href={`mailto:${loanEvent.borrowerEmail}`}
                                className="hover:text-gwc-primary"
                              >
                                {loanEvent.borrowerEmail}
                              </a>
                            </div>
                          )}
                          {loanEvent.borrowerPhone && (
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              <a 
                                href={`tel:${loanEvent.borrowerPhone}`}
                                className="hover:text-gwc-primary"
                              >
                                {loanEvent.borrowerPhone}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {loanEvent.borrowerAddress && (
                          <div>
                            <div className="flex items-start text-sm text-gray-600">
                              <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                              <span>{loanEvent.borrowerAddress}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Loan Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Uitgeleend op</p>
                        <p className="font-medium">
                          {format(new Date(loanEvent.createdAt), 'dd MMM yyyy', { locale: nl })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(loanEvent.createdAt), { 
                            addSuffix: true, 
                            locale: nl 
                          })}
                        </p>
                      </div>
                      
                      {loanEvent.expectedReturn && (
                        <div>
                          <p className="text-gray-600">Verwachte retour</p>
                          <p className="font-medium">
                            {format(new Date(loanEvent.expectedReturn), 'dd MMM yyyy', { locale: nl })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(loanEvent.expectedReturn), { 
                              addSuffix: true, 
                              locale: nl 
                            })}
                          </p>
                        </div>
                      )}
                      
                      {loanEvent.loanReference && (
                        <div>
                          <p className="text-gray-600">Referentie</p>
                          <p className="font-medium">{loanEvent.loanReference}</p>
                        </div>
                      )}
                    </div>

                    {loanEvent.description && (
                      <div>
                        <p className="text-gray-600 text-sm">Opmerkingen</p>
                        <p className="text-sm">{loanEvent.description}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/products/${loanEvent.product.id}`}
                      >
                        Product bekijken
                      </Button>
                      {loanEvent.borrowerEmail && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `mailto:${loanEvent.borrowerEmail}?subject=Herinnering retour: ${loanEvent.product.name}`}
                        >
                          Herinnering sturen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}