import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.keycloak.representations.AccessToken;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class KeycloakAuthTest {
private static final String CATALOGUE_SERVICE_URL = "http://localhost:3000/resources/requester/social-justice";

    public static void main(String[] args) {
        try {
            // Simulating a Keycloak access token
            AccessToken token = new AccessToken();
            token.setSubject("test-user");

            // Fetch authorization data from the catalogue service
            JsonNode authData = fetchAuthorizationsFromCatalogue();
            
            // Add the retrieved authorizations to the token
            token.getOtherClaims().put("authorizations", authData);

            // Print the token JSON
            ObjectMapper objectMapper = new ObjectMapper();
            String tokenJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(token);
            System.out.println("Generated Token with Authorizations:\n" + tokenJson);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static JsonNode fetchAuthorizationsFromCatalogue() throws Exception {
        URL url = new URL(CATALOGUE_SERVICE_URL);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "application/json");

        if (conn.getResponseCode() != 200) {
            System.err.println("Error: HTTP " + conn.getResponseCode());
            InputStream errorStream = conn.getErrorStream();
            if (errorStream != null) {
                Scanner scanner = new Scanner(errorStream);
                StringBuilder errorResponse = new StringBuilder();
                while (scanner.hasNext()) {
                    errorResponse.append(scanner.nextLine());
                }
                scanner.close();
                System.err.println("Response: " + errorResponse);
            }
            throw new RuntimeException("Failed to get authorizations: HTTP error code " + conn.getResponseCode());
        }

        // Read the response
        InputStream inputStream = conn.getInputStream();
        Scanner scanner = new Scanner(inputStream);
        StringBuilder response = new StringBuilder();
        while (scanner.hasNext()) {
            response.append(scanner.nextLine());
        }
        scanner.close();

        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readTree(response.toString());
    }
}
