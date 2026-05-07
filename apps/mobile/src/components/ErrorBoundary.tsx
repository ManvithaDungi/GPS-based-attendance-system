import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, opacity: 0.7 }}>
            Please restart the app. If this keeps happening, check device logs for details.
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#2563EB' }}
          >
            <Text style={{ color: 'white', fontWeight: '800' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

