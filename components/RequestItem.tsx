import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RequestObject } from "../app/services/requests";

export default function RequestItem({request}: {request: RequestObject}) {
    return (
        <View key={request.requestId} style={styles.taskerRequestCard}>
            {/* Header: Distance Badge + Title */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={styles.distanceBadge}>
                {request.distance && request.distance !== Infinity ? `📍 ${request.distance.toFixed(1)} ק"מ` : "📍 ? ק\"מ"}
              </Text>
              <Text style={styles.taskerRequestTitle}>{request.title}</Text>
            </View>

            {/* Description */}
            {/* {request.description && (
                      <Text style={styles.taskerRequestDescription} numberOfLines={2}>
                        {request.description}
                      </Text>
                    )} */}

            <TouchableOpacity
              style={styles.taskerTakeButton}
              onPress={() => router.push({
                pathname: '/task-details',
                params: {
                  request: JSON.stringify(request)
                }
              })}>
              <Text style={styles.taskerTakeButtonText}>הצג משימה</Text>
            </TouchableOpacity>
          </View>
    );
}

const styles = StyleSheet.create({
  taskerRequestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  taskerRequestTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "right",
    marginBottom: 8,
    flex: 1, // Allow text to wrap
  },

  taskerTakeButton: {
    backgroundColor: "#588157",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },

  taskerTakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  distanceBadge: {
    fontSize: 14,
    color: "#588157",
    fontWeight: "bold",
    backgroundColor: "#e9f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden'
  },
});