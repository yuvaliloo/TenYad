import React from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';


function GooglePlacesInput(){
  console.log("process.env.GOOGLE_MAPS_API_KEY: ", process.env.GOOGLE_MAPS_API_KEY);
  return (
    <GooglePlacesAutocomplete
      placeholder='hello world'
      onPress={(data, details = null) => {
        // 'details' is provided when fetchDetails = true
        console.log(data, details);
      }}
      query={{
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: 'he',
      }}
    />
  );
}

export default GooglePlacesInput;