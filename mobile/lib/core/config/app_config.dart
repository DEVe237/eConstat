/// Adresse de l'API, à fournir à la construction de l'app :
/// `flutter build apk --dart-define=API_URL=https://mon-api.exemple`.
/// Par défaut : le PC de développement (téléphone en USB + `adb reverse tcp:3000 tcp:3000`).
const String kApiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000');
