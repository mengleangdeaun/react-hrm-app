import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    Image,
    ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react-native';

export const CreateActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = () => {
        if (!title || !description) {
            Alert.alert('Required', 'Please fill in both title and description.');
            return;
        }
        Alert.alert('Activity Saved', 'Your work log entry has been saved successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#F8FAFC" size={20} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Log Daily Activity</Text>
                    <View style={{ width: 40 }} />
                </View>

                <Text style={styles.label}>Task / Activity Title</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Prepared Client Proposal & Site Visit"
                    placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Activity Details</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe progress, outcomes, or notes..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.label}>Attachment Photo</Text>
                {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImageUri(null)}>
                            <Text style={styles.removeImgText}>Remove Photo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.photoPickerRow}>
                        <TouchableOpacity style={styles.pickerTile} onPress={takePhoto}>
                            <Camera color="#3B82F6" size={24} />
                            <Text style={styles.pickerTileText}>Take Camera Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.pickerTile} onPress={pickImage}>
                            <ImageIcon color="#10B981" size={24} />
                            <Text style={styles.pickerTileText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitBtnText}>Save Activity Log</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { flex: 1 },
    content: { padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
    label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
    input: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', paddingHorizontal: 14, height: 48, fontSize: 14 },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    photoPickerRow: { flexDirection: 'row', gap: 12 },
    pickerTile: { flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
    pickerTileText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
    imagePreviewContainer: { alignItems: 'center', gap: 10 },
    imagePreview: { width: '100%', height: 180, borderRadius: 16 },
    removeImgBtn: { backgroundColor: '#EF444420', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    removeImgText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
    submitBtn: { backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
