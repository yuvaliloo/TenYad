import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "./services/firebase";
import { getUserLocation } from "./services/location";
import { RequestObject, fetchAllRequests } from "./services/requests";
import RequestItem from "../components/RequestItem";

export function TaskerMainPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestObject[]>([]);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  useEffect(() => {
    //TODO: make sure users grants location all of the time


    const fetchLocationAndSetup = async () => {
      try {
        const userLocation = await getUserLocation();
        if(!userLocation){
          Alert.alert("שגיאה", "בכדי לראות מטלות עלייך לאפשר גישה למיקום שלך.");
          setLoading(false);
          return;
        }
        const fetchedRequests = await fetchAllRequests().then((requests: RequestObject[]) => {
          return requests.filter(r => (r.seekerId !== currentUser?.uid && r.status === "open"));
        })

        // Calculate distance after requests are fetched
        const requestsWithDistance = fetchedRequests.map((r) => {
          let dist = Infinity;
          if (r.location.latitude && r.location.longitude && userLocation) {
            dist = getDistanceFromLatLonInKm(
              userLocation.lat, userLocation.lng,
              r.location.latitude, r.location.longitude
            );
          }
          return { ...r, distance: dist };
        });

        setRequests(requestsWithDistance);
      } catch (err) {
        console.error("Error fetching location or requests:", err);
      }
      setLoading(false);
    };

    fetchLocationAndSetup()
  }, []);



  if (!currentUser) {
    router.replace("/login");
    return <></>;
  }
  return <>
    <Text style={styles.taskerHeader}>ברוך הבא למצב נותן יד</Text>
    <Text style={styles.taskerSubtitle}>בחר משימה והתחל להרוויח</Text>
    <ScrollView style={styles.taskerRequestsList}>

      {loading && <ActivityIndicator size="large" color="#588157" style={{marginTop: 20}} /> }
      {requests.length>0 &&
        requests.map((r) => <RequestItem key={r.requestId} request={r} />)
      }
      {(!requests.length) && <Text style={styles.taskerEmptyText}>אין משימות זמינות באזורך</Text>}
    </ScrollView>
  </>
}

const styles = StyleSheet.create({
  taskerHeader: {
    fontSize: 26,
    fontWeight: "700",
    color: "#6f411d",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 110,
  },

  taskerSubtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },

  taskerRequestsList: {
    flex: 1,
    marginTop: 20,
  },

  taskerEmptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});