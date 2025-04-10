"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database } from "@/types/supabase";
import UserDropdown from "@/components/UserDropdown";
import { UserIcon, SettingsIcon, CourseIcon, PaymentIcon, LogoutIcon, ThemeIcon } from "@/components/Icons";

interface UserProfile {
  id: string;
  email: string;
  subscription: "free" | "paid";
  stripe_customer_id: string | null;
  profile_photo_url: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

export default function PaymentMethodsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.push("/");
          return;
        }
        
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.push("/");
          return;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userData.user.id)
          .single();
          
        if (profileError || !profileData) {
          setErrorMessage("Failed to load profile");
          return;
        }
        
        setUserProfile(profileData as UserProfile);
        
        // If the user has a Stripe customer ID, fetch their payment methods
        if (profileData.stripe_customer_id && profileData.subscription === "paid") {
          await fetchPaymentMethods(profileData.stripe_customer_id);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [router, supabase]);
  
  const fetchPaymentMethods = async (customerId: string) => {
    try {
      // In a real application, this would be a secure API call to your backend
      // which would then use Stripe's API to fetch the customer's payment methods
      
      // Mock data for demonstration
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: "pm_mock1",
          brand: "visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2024,
          isDefault: true
        }
      ];
      
      setPaymentMethods(mockPaymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setErrorMessage("Failed to load payment methods");
    }
  };
  
  const handleAddNewCard = async () => {
    // In a real application, this would redirect to a Stripe-hosted page
    // or open a Stripe Elements form to securely collect card details
    
    setIsProcessing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage("This would redirect to Stripe to add a new payment method");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error starting add card process:", error);
      setErrorMessage("Failed to initiate add card process");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSetDefaultCard = async (paymentMethodId: string) => {
    setIsProcessing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setPaymentMethods(methods => 
        methods.map(method => ({
          ...method,
          isDefault: method.id === paymentMethodId
        }))
      );
      
      setSuccessMessage("Default payment method updated");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error setting default payment method:", error);
      setErrorMessage("Failed to update default payment method");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRemoveCard = async (paymentMethodId: string) => {
    setIsProcessing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setPaymentMethods(methods => 
        methods.filter(method => method.id !== paymentMethodId)
      );
      
      setSuccessMessage("Payment method removed");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error removing payment method:", error);
      setErrorMessage("Failed to remove payment method");
      
      // Clear error message after 3 seconds
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/");
    } else {
      console.error("Logout failed");
    }
  };
  
  // Dropdown menu items for header
  const dropdownItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <CourseIcon className="h-4 w-4" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <SettingsIcon className="h-4 w-4" />,
    },
    {
      label: "Theme",
      href: "/theme",
      icon: <ThemeIcon className="h-4 w-4" />,
    },
    {
        label: "Divider",
      divider: true,
    },
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogoutIcon className="h-4 w-4" />,
      danger: true,
    },
  ];
  
  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M290 358.4H233.9L269.3 144.1H325.4L290 358.4Z" fill="#00579F"/>
            <path d="M523.2 149.5C511.3 144.7 492.9 139.5 470.2 139.5C413.9 139.5 374.7 169.1 374.3 210.9C373.9 242.2 403.1 259.6 424.9 270.2C447.2 281 455.1 288 455.1 297.7C454.7 313.3 435.5 320.5 417.5 320.5C392.7 320.5 379.2 316.9 358.4 307.8L350.1 303.8L341.4 350.8C355.7 357.2 383.2 362.8 411.7 363.2C471.8 363.2 510.2 334 510.6 289.8C510.9 265.4 495.3 246.6 461.1 230.6C440.3 220 428 213.2 428 202.6C428.4 192.7 439.1 182.8 461.1 182.8C479.4 182.4 492.1 187.2 502 191.9L507.8 194.7L516.5 149.5H523.2Z" fill="#00579F"/>
            <path d="M611.2 265.4C617 250.6 639.4 190.8 639.4 190.8C639 191.2 646.1 172 649.6 160.1L654.6 188C654.6 188 667.7 252.6 670.4 265.8C664.1 265.8 624.7 265.8 611.2 265.4ZM684.3 144.1H642.5C625.5 144.1 613.2 149.1 606.2 168.3L518.8 358H578.5C578.5 358 589.6 328.9 592 322.1C598.7 322.1 660.4 322.1 669.1 322.1C670.8 331.3 676.8 358 676.8 358H729.9L684.3 144.1Z" fill="#00579F"/>
            <path d="M201.8 144.1L145.7 288.4L140.2 263.8C130 231.7 98.7 197.2 63.7 179.6L114.9 358H175L261.9 144.1H201.8Z" fill="#00579F"/>
            <path d="M93.7 144.1H0.5L0 149.1C72.5 165.1 120.4 210.1 140.2 263.8L119.9 168.3C116 149.5 106.1 144.5 93.7 144.1Z" fill="#F9A51A"/>
          </svg>
        );
      case 'mastercard':
        return (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M490 250C490 336.5 420.5 406 334 406C247.5 406 178 336.5 178 250C178 163.5 247.5 94 334 94C420.5 94 490 163.5 490 250Z" fill="#D9222A"/>
            <path d="M334 94C247.5 94 178 163.5 178 250C178 336.5 247.5 406 334 406C420.5 406 490 336.5 490 250" fill="#EE9F2D"/>
            <path d="M334 406C393.5 406 446 377.5 477 334H191C222 377.5 274.5 406 334 406Z" fill="#000066"/>
            <path d="M334 94C274.5 94 222 122.5 191 166H477C446 122.5 393.5 94 334 94Z" fill="#000066"/>
          </svg>
        );
      case 'amex':
        return (
          <svg className="h-6 w-8" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 220.5V260H62.5L69.5 241H89V260H168V241H192C192 241 197 241 198.5 246V260H320.5V240.5C320.5 240.5 327 239 330 246C333 253 333 260 333 260H368V206H332C332 206 325 206 322 213C319 220 319 220 319 220H300V206H249.5L243 225.5L236.5 206H132V213C132 213 126 206 115 206H62.5L56 224.5L49.5 206H0V220.5ZM6.5 225H36.5L56 279L76 225H105.5V279H89V235L65.5 279H46.5L23 235V279H6.5V225ZM115.5 225H179V238H132V245.5H177.5V258.5H132V266.5H179V279.5H115.5V225ZM190.5 225H224.5V238H207V245.5H224V258.5H207V266.5H224.5V279.5H190.5V225ZM232.5 225H262.5L282 279L302 225H331.5V279H315V235L291.5 279H272.5L249 235V279H232.5V225ZM341.5 225H405V238H358V245.5H403.5V258.5H358V266.5H405V279.5H341.5V225ZM416.5 225H450.5V266.5H480V279.5H416.5V225ZM517 225C517 225 546.5 225 562.5 225C578.5 225 585.5 237.5 585.5 246C585.5 254.5 580 260 574.5 262.5C569 265 564.5 265 564.5 265L587 279.5H564.5L545 267H539.5V279.5H517V225ZM539.5 238V254.5H559C559 254.5 563.5 254 563.5 246C563.5 238 557 238 555 238H539.5ZM594.5 225H628.5V266.5H658V279.5H594.5V225ZM676 225C676 225 732 225 740 225C748 225 756 233 756 241C756 249 748 253.5 748 253.5C748 253.5 757 257 757 266.5C757 276 748 279.5 740.5 279.5C733 279.5 676 279.5 676 279.5V225ZM698.5 238V246H732.5C732.5 246 735 246 735 242C735 238 731.5 238 730 238H698.5ZM698.5 258.5V267H734C734 267 735.5 266.5 735.5 262.5C735.5 258.5 733 258.5 731 258.5H698.5Z" fill="#006FCF"/>
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M2 10H22" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
    }
  };
  
  if (isLoading) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading payment information...</p>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="ios-container flex items-center justify-center h-screen">
        <div className="ios-card text-center">
          <p className="text-gray-800 mb-4">Unable to load payment information</p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="ios-button ios-button-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ios-container max-w-full">
      {/* Header */}
      <div className="ios-header mb-6 md:mb-8 flex justify-between items-center max-w-screen-xl mx-auto">
        <Link href="/dashboard" className="text-primary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
          Dashboard
        </Link>
        <UserDropdown 
          userEmail={userProfile.email}
          userPhotoUrl={userProfile.profile_photo_url || undefined}
          items={dropdownItems}
        />
      </div>
      
      <div className="ios-animate-in max-w-screen-xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Payment Methods</h1>
            <Link href="/profile" className="text-sm text-primary">
              Back to Profile
            </Link>
          </div>
          
          {successMessage && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {errorMessage}
            </div>
          )}
          
          {/* Subscription Status */}
          <div className="ios-card mb-6">
            <h2 className="text-lg font-semibold mb-2">Subscription Status</h2>
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <span className="mr-2">Current Plan:</span>
                {userProfile.subscription === "paid" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Free
                  </span>
                )}
              </div>
              
              {userProfile.subscription === "free" && (
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <p className="text-sm text-gray-600 mb-3 sm:mb-0 sm:mr-4">
                    Upgrade to Premium to unlock all features and learning paths.
                  </p>
                  <Link href="/dashboard" className="inline-block">
                    <button className="ios-button ios-button-primary w-full sm:w-auto">
                      Upgrade to Premium
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Payment Methods List */}
          <div className="ios-card mb-6">
            <h2 className="text-lg font-semibold mb-4">Your Payment Methods</h2>
            
            {userProfile.subscription === "free" ? (
              <div className="text-center py-6">
                <div className="h-16 w-16 mx-auto mb-4 text-gray-300">
                  <PaymentIcon className="h-full w-full" />
                </div>
                <p className="text-gray-500 mb-4">
                  No payment methods available for free accounts.
                </p>
                <p className="text-sm text-gray-500">
                  Upgrade to Premium to add payment methods.
                </p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-6">
                <div className="h-16 w-16 mx-auto mb-4 text-gray-300">
                  <PaymentIcon className="h-full w-full" />
                </div>
                <p className="text-gray-500 mb-4">
                  You haven't added any payment methods yet.
                </p>
                <button 
                  onClick={handleAddNewCard}
                  disabled={isProcessing}
                  className="ios-button ios-button-primary"
                >
                  {isProcessing ? 'Processing...' : 'Add Payment Method'}
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4 md:p-5 transition-all hover:shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <div className="mr-3">
                          {getBrandIcon(method.brand)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {method.exp_month}/{method.exp_year}
                          </p>
                          {method.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultCard(method.id)}
                              disabled={isProcessing}
                              className="text-sm text-primary hover:text-primary-dark whitespace-nowrap"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveCard(method.id)}
                            disabled={isProcessing}
                            className="text-sm text-red-600 hover:text-red-700 whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 md:flex md:justify-end">
                  <button 
                    onClick={handleAddNewCard}
                    disabled={isProcessing}
                    className="ios-button ios-button-secondary w-full md:w-auto"
                  >
                    {isProcessing ? 'Processing...' : 'Add New Card'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Billing History */}
          {userProfile.subscription === "paid" && (
            <div className="ios-card mb-6">
              <h2 className="text-lg font-semibold mb-4">Billing History</h2>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          May 1, 2023
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          $8.00
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Paid
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          April 1, 2023
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          $8.00
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Paid
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4 text-right">
                <a href="#" className="text-sm text-primary">
                  Download Invoices
                </a>
              </div>
            </div>
          )}
          
          {/* Cancellation */}
          {userProfile.subscription === "paid" && (
            <div className="ios-card mb-6 border-red-200">
              <h2 className="text-lg font-semibold mb-4 text-red-600">Cancel Subscription</h2>
              
              <div className="md:flex md:items-center md:justify-between">
                <p className="text-sm text-gray-600 mb-4 md:mb-0 md:mr-4 md:flex-1">
                  If you cancel your subscription, you'll still have access to Premium features until the end of your current billing period.
                </p>
                
                <button 
                  className="text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full md:w-auto"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}