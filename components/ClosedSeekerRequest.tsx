import { RequestObject } from "@/app/services/requests";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";


export default function ClosedSeekerRequest({request}: {request: RequestObject}) {
    return(
        <View style={[styles.requestItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View>
              {/* {request.workerId ? (
                reviewedTaskIds.has(request.requestId) ? (
                  <Text style={{ color: '#588157', fontSize: 14, fontWeight: '600' }}>
                    ✓ ביקורת נשלחה
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => openReviewModal(request)}
                  >
                    <Text style={styles.reviewButtonText}>סמן כבוצע</Text>
                  </TouchableOpacity>
                )
              ) : null} */}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>עובד: {request.workerId}</Text>
            </View>
        </View>
    )
}
const styles = StyleSheet.create({
    reviewButtonText: {
      color: '#ffffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    reviewButton: {
      backgroundColor: '#6f411d',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
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
  