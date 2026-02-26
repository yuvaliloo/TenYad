import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Review, calculateAverageRating, getReviewsForUser } from '../app/services/reviews';

interface ReviewWindowProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

export default function ReviewWindow({
  visible,
  onClose,
  userId,
  userName = 'משתמש',
}: ReviewWindowProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (visible) {
      fetchReviews();
    }
  }, [visible, userId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const result = await getReviewsForUser(userId);
      if (result.success) {
        setReviews(result.reviews);
        const avgRating = calculateAverageRating(result.reviews);
        setAverageRating(avgRating);
      } else {
        Alert.alert('שגיאה', 'לא ניתן היה לטעון את הביקורות');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת טעינת הביקורות');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={[
              styles.star,
              star <= rating ? styles.starFilled : styles.starEmpty,
            ]}
          >
            ★
          </Text>
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.reviewerName}</Text>
          <Text style={styles.reviewDate}>
            {item.createdAt
              ? new Date(
                  item.createdAt.toDate?.() || item.createdAt
                ).toLocaleDateString('he-IL')
              : 'תאריך לא זמין'}
          </Text>
        </View>
        {renderStars(item.rating)}
      </View>

      {item.taskTitle && (
        <Text style={styles.taskTitle}>📋 {item.taskTitle}</Text>
      )}

      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  const emptyListMessage = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>אין ביקורות עדיין</Text>
      <Text style={styles.emptySubtext}>
        כאשר משתמשים יוסיפו ביקורות, הן תופיע כאן
      </Text>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{userName}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(Math.round(averageRating))}
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} / 5
              </Text>
              <Text style={styles.reviewCountText}>
                ({reviews.length} ביקורות)
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#588157" />
            <Text style={styles.loadingText}>טוען ביקורות...</Text>
          </View>
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReviewItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            ListEmptyComponent={emptyListMessage}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
          />
        )}

        {/* Footer */}
        <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
          <Text style={styles.closeModalButtonText}>סגור</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
    pointerEvents: 'auto',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    pointerEvents: 'auto',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    minHeight: 300,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#588157',
  },
  reviewCountText: {
    fontSize: 12,
    color: '#999',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  starFilled: {
    color: '#FFB800',
  },
  starEmpty: {
    color: '#ddd',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#588157',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  taskTitle: {
    fontSize: 12,
    color: '#588157',
    fontWeight: '500',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reviewComment: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#588157',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
