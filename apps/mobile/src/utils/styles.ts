import { Platform } from 'react-native';

export const shadow = (
  color = '#000',
  offset = { x: 0, y: 2 },
  opacity = 0.25,
  radius = 4,
  elevation = 4
) =>
  Platform.select({
    web: {
      boxShadow: `${offset.x}px ${offset.y}px ${radius}px rgba(0,0,0,${opacity})`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offset.x, height: offset.y },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });
