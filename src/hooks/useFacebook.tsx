
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context
interface FacebookContextType {
  sdkLoaded: boolean;
  login: (appId: string) => Promise<any>;
  logout: () => Promise<any>;
}

// Create the context
const FacebookContext = createContext<FacebookContextType | undefined>(undefined);

// Define the provider component
interface FacebookProviderProps {
  children: ReactNode;
}

export const FacebookProvider: React.FC<FacebookProviderProps> = ({ children }) => {
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    if (window.fbAsyncInit) {
        // If it's already defined, we might be in a fast-refresh scenario.
        // Re-run init just in case.
        if((window as any).FB) {
             (window as any).FB.init({
                appId: 'YOUR_APP_ID', // A placeholder, will be re-initialized on login
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
        }
        setSdkLoaded(true);
        return;
    }
    
    window.fbAsyncInit = function() {
        (window as any).FB.init({
            appId: 'YOUR_APP_ID', // Placeholder, will be re-init with real id
            cookie: true,
            xfbml: true,
            version: 'v19.0'
        });
        setSdkLoaded(true);
    };

    // Load the SDK script
    (function(d, s, id){
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) {return;}
        js = d.createElement(s) as HTMLScriptElement; js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        if(fjs.parentNode) {
            fjs.parentNode.insertBefore(js, fjs);
        }
    }(document, 'script', 'facebook-jssdk'));

  }, []);

  const login = (appId: string) => {
    return new Promise((resolve, reject) => {
      if (!sdkLoaded || !(window as any).FB) {
        reject(new Error("Facebook SDK not loaded."));
        return;
      }
      
      // Re-initialize with the correct app ID before logging in
      (window as any).FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
      });

      (window as any).FB.login((response: any) => {
        if (response.authResponse) {
          resolve(response);
        } else {
          reject('User cancelled login or did not fully authorize.');
        }
      }, { scope: 'email,public_profile,pages_show_list,pages_read_engagement,pages_manage_posts' });
    });
  };

  const logout = () => {
    return new Promise((resolve, reject) => {
        if (!sdkLoaded || !(window as any).FB) {
            reject(new Error("Facebook SDK not loaded."));
            return;
        }
       (window as any).FB.logout((response: any) => {
            resolve(response);
       });
    });
  };


  return (
    <FacebookContext.Provider value={{ sdkLoaded, login, logout }}>
      {children}
    </FacebookContext.Provider>
  );
};

// Custom hook to use the context
export const useFacebook = (): FacebookContextType => {
  const context = useContext(FacebookContext);
  if (context === undefined) {
    throw new Error('useFacebook must be used within a FacebookProvider');
  }
  return context;
};
