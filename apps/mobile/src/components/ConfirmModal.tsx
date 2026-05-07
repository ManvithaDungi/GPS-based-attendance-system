import React from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme/colors";
import { NeumorphicCard, NeumorphicButton } from "./NeumorphicCard";
import { rs, rvs, rms } from "../utils/responsive";

interface Props {
   visible: boolean;
   onConfirm: () => void;
   onCancel: () => void;
   message: string;
}

export const ConfirmModal: React.FC<Props> = ({
   visible,
   onConfirm,
   onCancel,
   message,
}) => {
   const { theme } = useTheme();
   const themeColors = colors[theme];

   return (
      <Modal transparent visible={visible} animationType="fade">
         <View style={styles.overlay}>
            <NeumorphicCard style={styles.modal}>
               <Text style={[styles.text, { color: themeColors.text }]}>
                  {message}
               </Text>

               <View style={styles.actions}>
                  <NeumorphicButton onPress={onCancel} style={styles.btn}>
                     <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>
                        Cancel
                     </Text>
                  </NeumorphicButton>

                  <NeumorphicButton onPress={onConfirm} style={styles.btn}>
                     <Text style={[styles.confirmText, { color: themeColors.error }]}>
                        Yes
                     </Text>
                  </NeumorphicButton>
               </View>
            </NeumorphicCard>
         </View>
      </Modal>
   );
};

const styles = StyleSheet.create({
   overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: rs(24),
   },
   modal: {
      width: "100%",
      padding: rs(20),
      gap: rvs(20),
      borderRadius: rs(20),
   },
   text: {
      fontSize: rms(16),
      fontWeight: "700",
      textAlign: "center",
   },
   actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: rs(12),
   },
   btn: {
      flex: 1,
      height: rvs(50),
   },
   cancelText: {
      fontSize: rms(14),
      fontWeight: "700",
   },
   confirmText: {
      fontSize: rms(14),
      fontWeight: "800",
   },
});