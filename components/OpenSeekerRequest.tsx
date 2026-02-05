import { RequestObject } from "@/app/services/requests";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";


export default function OpenSeekerRequest({request}: {request: RequestObject}) {
    
    return (
        <View style={styles.requestItem}>
          <View style={styles.requestHeader}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: '#c0392b' }]}
              onPress={() => handleDeleteRequest(request.requestId)}
            >
              <Text style={styles.editButtonText}>הסר</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestTitle}>{request.title}</Text>
            </View>
          </View>
          {/* Interested Taskers List */}
          {Object.keys(request.interestedTaskers).length > 0 && (
            <View style={styles.interestedTaskersContainer}>
              <Text style={styles.interestedTaskersTitle}>מעוניינים:</Text>
              {Object.values(request.interestedTaskers).map((tasker: any, index: number) => (
                <View key={index} style={styles.interestedTaskerRow}>
                  <TouchableOpacity
                    style={styles.showTaskerButton}
                    onPress={() => openTaskerDetails(tasker, request.requestId)}
                  >
                    <Text style={styles.showTaskerButtonText}>הצג</Text>
                  </TouchableOpacity>
                  <Text style={styles.interestedTaskerName}>
                    {tasker.taskerName}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
    )
}

const styles = StyleSheet.create({
  requestItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },

  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  editButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  requestTitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "right",
    flex: 1,
    marginRight: 10,
  },

  // Interested Taskers
  interestedTaskersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  interestedTaskersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#588157",
    textAlign: "right",
    marginBottom: 6,
  },

  interestedTaskerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  interestedTaskerName: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
    flex: 1,
  },

  showTaskerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },

  showTaskerButtonText: {
    color: "#588157",
    fontSize: 14,
    fontWeight: "600",
  },
});
